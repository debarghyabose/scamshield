"""Test fixtures: an in-memory database and a fake token verifier, so the API
can be exercised end-to-end without a real Supabase project."""

from __future__ import annotations

import copy
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.supabase import get_db  # noqa: E402
from main import app  # noqa: E402
from routers.auth import AuthUser, InvalidToken, get_token_verifier  # noqa: E402
from services.rate_limit import report_limiter, scan_limiter  # noqa: E402

ALICE = AuthUser(id="11111111-1111-1111-1111-111111111111", email="alice@example.com", full_name="Alice", provider="email")
BOB = AuthUser(id="22222222-2222-2222-2222-222222222222", email="bob@example.com", full_name="Bob", provider="google")
TOKENS = {"aaa.alice.sig": ALICE, "bbb.bob.sig": BOB}


class FakeVerifier:
    async def verify(self, token: str) -> AuthUser:
        if token not in TOKENS:
            raise InvalidToken("bad")
        return TOKENS[token]


class MemoryDB:
    def __init__(self):
        self.scans: list[dict] = []
        self.profiles: dict[str, dict] = {}
        self.reports: list[dict] = []

    @staticmethod
    def _now():
        return datetime.now(timezone.utc).isoformat()

    def insert_scan(self, user_id, row):
        rec = {**copy.deepcopy(row), "user_id": user_id, "id": str(uuid.uuid4()), "created_at": row.get("created_at") or self._now()}
        self.scans.insert(0, rec)
        return rec

    def list_scans(self, user_id, *, limit, offset, scan_type, risk_level):
        rows = [s for s in self.scans if s["user_id"] == user_id
                and (not scan_type or s["scan_type"] == scan_type) and (not risk_level or s["risk_level"] == risk_level)]
        return rows[offset:offset + limit], len(rows)

    def get_scan(self, user_id, scan_id):
        return next((s for s in self.scans if s["user_id"] == user_id and s["id"] == scan_id), None)

    def delete_scan(self, user_id, scan_id):
        before = len(self.scans)
        self.scans = [s for s in self.scans if not (s["user_id"] == user_id and s["id"] == scan_id)]
        return len(self.scans) < before

    def scan_stats_rows(self, user_id, max_rows=10_000):
        return [s for s in self.scans if s["user_id"] == user_id][:max_rows]

    def get_profile(self, user_id):
        return copy.deepcopy(self.profiles.get(user_id))

    def create_profile(self, user_id, *, email, full_name, avatar_url):
        self.profiles.setdefault(user_id, {
            "id": str(uuid.uuid4()), "user_id": user_id, "email": email, "full_name": full_name, "avatar_url": avatar_url,
            "theme": "system", "notifications_enabled": True, "language": "en", "created_at": self._now(), "updated_at": self._now(),
        })
        return self.get_profile(user_id)

    def update_profile(self, user_id, fields):
        if user_id not in self.profiles:
            return None
        self.profiles[user_id].update(fields)
        return self.get_profile(user_id)

    def insert_report(self, user_id, row):
        rec = {**row, "user_id": user_id, "id": str(uuid.uuid4()), "created_at": self._now()}
        self.reports.insert(0, rec)
        return rec

    def list_reports(self, user_id, *, limit):
        return [r for r in self.reports if r["user_id"] == user_id][:limit]


@pytest.fixture()
def db():
    return MemoryDB()


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_token_verifier] = lambda: FakeVerifier()
    scan_limiter.reset()
    report_limiter.reset()
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


ALICE_H = auth("aaa.alice.sig")
BOB_H = auth("bbb.bob.sig")
