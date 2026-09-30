"""
Database access through Supabase (PostgREST) using the service-role key.

The service-role key bypasses Row Level Security, so EVERY query here is
explicitly scoped with `.eq("user_id", user_id)`, where user_id always comes
from a verified access token (see routers/auth.py) — never from the request
body. RLS remains enabled in the database as a second line of defence for
any direct client access with the anon key.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Protocol

from config import get_settings

log = logging.getLogger("scamshield.db")

LIST_COLUMNS = "id,scan_type,input_text,risk_level,risk_score,category,summary,created_at"
STATS_COLUMNS = "risk_level,risk_score,scan_type,category,created_at"
PROFILE_COLUMNS = "id,user_id,full_name,email,avatar_url,theme,notifications_enabled,language,created_at,updated_at"
REPORT_COLUMNS = "id,scam_type,content,phone_number,url,description,created_at"


class DatabaseError(RuntimeError):
    """The database could not be reached or rejected the query."""


class DatabaseNotConfigured(DatabaseError):
    """SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing."""


class Database(Protocol):
    def insert_scan(self, user_id: str, row: dict[str, Any]) -> dict[str, Any]: ...
    def list_scans(self, user_id: str, *, limit: int, offset: int, scan_type: str | None, risk_level: str | None) -> tuple[list[dict], int]: ...
    def get_scan(self, user_id: str, scan_id: str) -> dict[str, Any] | None: ...
    def delete_scan(self, user_id: str, scan_id: str) -> bool: ...
    def scan_stats_rows(self, user_id: str, max_rows: int = 10_000) -> list[dict[str, Any]]: ...
    def get_profile(self, user_id: str) -> dict[str, Any] | None: ...
    def create_profile(self, user_id: str, *, email: str | None, full_name: str | None, avatar_url: str | None) -> dict[str, Any]: ...
    def update_profile(self, user_id: str, fields: dict[str, Any]) -> dict[str, Any] | None: ...
    def insert_report(self, user_id: str, row: dict[str, Any]) -> dict[str, Any]: ...
    def list_reports(self, user_id: str, *, limit: int) -> list[dict[str, Any]]: ...


class SupabaseDatabase:
    PAGE = 1000  # PostgREST's default max rows per request on Supabase

    def __init__(self, url: str, service_role_key: str):
        from supabase import create_client  # imported lazily so tests don't need network

        self.client = create_client(url, service_role_key)

    def _run(self, query):
        try:
            return query.execute()
        except Exception as exc:  # postgrest.APIError, httpx errors, …
            log.error("Supabase query failed: %s", type(exc).__name__)
            raise DatabaseError("Database request failed") from exc

    # --- scans -------------------------------------------------------
    def insert_scan(self, user_id, row):
        res = self._run(self.client.table("scans").insert({**row, "user_id": user_id}))
        return res.data[0]

    def list_scans(self, user_id, *, limit, offset, scan_type, risk_level):
        q = self.client.table("scans").select(LIST_COLUMNS, count="exact").eq("user_id", user_id)
        if scan_type:
            q = q.eq("scan_type", scan_type)
        if risk_level:
            q = q.eq("risk_level", risk_level)
        res = self._run(q.order("created_at", desc=True).range(offset, offset + limit - 1))
        return res.data or [], res.count or 0

    def get_scan(self, user_id, scan_id):
        res = self._run(self.client.table("scans").select("*").eq("user_id", user_id).eq("id", scan_id).limit(1))
        return res.data[0] if res.data else None

    def delete_scan(self, user_id, scan_id):
        res = self._run(self.client.table("scans").delete().eq("user_id", user_id).eq("id", scan_id))
        return bool(res.data)

    def scan_stats_rows(self, user_id, max_rows=10_000):
        rows: list[dict] = []
        offset = 0
        while offset < max_rows:
            res = self._run(
                self.client.table("scans")
                .select(STATS_COLUMNS)
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .range(offset, offset + self.PAGE - 1)
            )
            batch = res.data or []
            rows.extend(batch)
            if len(batch) < self.PAGE:
                break
            offset += self.PAGE
        return rows

    # --- profiles ----------------------------------------------------
    def get_profile(self, user_id):
        res = self._run(self.client.table("profiles").select(PROFILE_COLUMNS).eq("user_id", user_id).limit(1))
        return res.data[0] if res.data else None

    def create_profile(self, user_id, *, email, full_name, avatar_url):
        self._run(
            self.client.table("profiles").upsert(
                {"user_id": user_id, "email": email, "full_name": full_name, "avatar_url": avatar_url},
                on_conflict="user_id",
                ignore_duplicates=True,
            )
        )
        profile = self.get_profile(user_id)
        if profile is None:
            raise DatabaseError("Profile could not be created")
        return profile

    def update_profile(self, user_id, fields):
        res = self._run(self.client.table("profiles").update(fields).eq("user_id", user_id))
        if not res.data:
            return None
        return self.get_profile(user_id)

    # --- reports -----------------------------------------------------
    def insert_report(self, user_id, row):
        res = self._run(self.client.table("reports").insert({**row, "user_id": user_id}))
        return res.data[0]

    def list_reports(self, user_id, *, limit):
        res = self._run(
            self.client.table("reports").select(REPORT_COLUMNS).eq("user_id", user_id).order("created_at", desc=True).limit(limit)
        )
        return res.data or []


@lru_cache
def _firebase_db():
    from database.firebase_db import FirestoreDatabase
    s = get_settings()
    return FirestoreDatabase(s.firebase_project_id)


def get_db() -> Database:
    """FastAPI dependency. Overridden in tests with an in-memory implementation."""
    if not get_settings().firebase_configured:
        raise DatabaseNotConfigured("Database is not configured")
    return _firebase_db()


def get_optional_db(request) -> Database | None:
    """Like get_db, but returns None when Database isn't configured (anonymous
    scans still work). Honours test overrides of get_db."""
    provider = request.app.dependency_overrides.get(get_db, get_db)
    try:
        return provider()
    except DatabaseNotConfigured:
        return None

