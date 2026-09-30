"""
Database access through Firebase Cloud Firestore using firebase-admin SDK,
with an in-memory local fallback for development environments.
"""

from __future__ import annotations

import copy
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from config import get_settings

log = logging.getLogger("scamshield.firebase_db")


class DatabaseError(RuntimeError):
    """The database could not be reached or rejected the query."""


class DatabaseNotConfigured(DatabaseError):
    """Firebase project or credentials are missing."""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class FirestoreDatabase:
    def __init__(self, project_id: str | None = None):
        self.db = None
        self._mem_scans: list[dict] = []
        self._mem_profiles: dict[str, dict] = {}
        self._mem_reports: list[dict] = []

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                cred = credentials.ApplicationDefault() if not get_settings().firebase_service_account_path else credentials.Certificate(get_settings().firebase_service_account_path)
                try:
                    firebase_admin.initialize_app(cred, {"projectId": project_id or get_settings().firebase_project_id})
                except Exception:
                    firebase_admin.initialize_app(options={"projectId": project_id or get_settings().firebase_project_id})

            self.db = firestore.client()
        except Exception as exc:
            log.warning("Firestore client initialization fallback to memory store: %s", exc)
            self.db = None

    # --- scans -------------------------------------------------------
    def insert_scan(self, user_id: str, row: dict[str, Any]) -> dict[str, Any]:
        scan_id = str(uuid.uuid4())
        created_at = row.get("created_at") or _now_iso()
        rec = {
            **copy.deepcopy(row),
            "id": scan_id,
            "user_id": user_id,
            "created_at": created_at,
        }
        if self.db is not None:
            try:
                self.db.collection("scans").document(scan_id).set(rec)
                return rec
            except Exception as exc:
                log.warning("Firestore insert_scan failed, writing to memory store: %s", exc)

        self._mem_scans.insert(0, rec)
        return rec

    def list_scans(
        self,
        user_id: str,
        *,
        limit: int,
        offset: int,
        scan_type: str | None,
        risk_level: str | None,
    ) -> tuple[list[dict], int]:
        if self.db is not None:
            try:
                query = self.db.collection("scans").where("user_id", "==", user_id)
                if scan_type:
                    query = query.where("scan_type", "==", scan_type)
                if risk_level:
                    query = query.where("risk_level", "==", risk_level)

                docs = list(query.stream())
                all_items = [d.to_dict() for d in docs if d.exists]
                all_items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
                total = len(all_items)
                paginated = all_items[offset : offset + limit]
                return paginated, total
            except Exception as exc:
                log.warning("Firestore list_scans failed, reading from memory store: %s", exc)

        rows = [
            s for s in self._mem_scans
            if s["user_id"] == user_id
            and (not scan_type or s.get("scan_type") == scan_type)
            and (not risk_level or s.get("risk_level") == risk_level)
        ]
        return rows[offset : offset + limit], len(rows)

    def get_scan(self, user_id: str, scan_id: str) -> dict[str, Any] | None:
        if self.db is not None:
            try:
                doc = self.db.collection("scans").document(scan_id).get()
                if doc.exists:
                    data = doc.to_dict()
                    if data and data.get("user_id") == user_id:
                        return data
                return None
            except Exception as exc:
                log.warning("Firestore get_scan failed: %s", exc)

        return next((s for s in self._mem_scans if s["user_id"] == user_id and s["id"] == scan_id), None)

    def delete_scan(self, user_id: str, scan_id: str) -> bool:
        if self.db is not None:
            try:
                doc_ref = self.db.collection("scans").document(scan_id)
                doc = doc_ref.get()
                if doc.exists and doc.to_dict().get("user_id") == user_id:
                    doc_ref.delete()
                    return True
                return False
            except Exception as exc:
                log.warning("Firestore delete_scan failed: %s", exc)

        before = len(self._mem_scans)
        self._mem_scans = [s for s in self._mem_scans if not (s["user_id"] == user_id and s["id"] == scan_id)]
        return len(self._mem_scans) < before

    def scan_stats_rows(self, user_id: str, max_rows: int = 10_000) -> list[dict[str, Any]]:
        if self.db is not None:
            try:
                docs = self.db.collection("scans").where("user_id", "==", user_id).stream()
                items = [d.to_dict() for d in docs if d.exists]
                items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
                return items[:max_rows]
            except Exception as exc:
                log.warning("Firestore scan_stats_rows failed: %s", exc)

        return [s for s in self._mem_scans if s["user_id"] == user_id][:max_rows]

    # --- profiles ----------------------------------------------------
    def get_profile(self, user_id: str) -> dict[str, Any] | None:
        if self.db is not None:
            try:
                doc = self.db.collection("profiles").document(user_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as exc:
                log.warning("Firestore get_profile failed: %s", exc)

        return copy.deepcopy(self._mem_profiles.get(user_id))

    def create_profile(
        self, user_id: str, *, email: str | None, full_name: str | None, avatar_url: str | None
    ) -> dict[str, Any]:
        now = _now_iso()
        profile_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "email": email,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "theme": "system",
            "notifications_enabled": True,
            "language": "en",
            "created_at": now,
            "updated_at": now,
        }

        if self.db is not None:
            try:
                doc_ref = self.db.collection("profiles").document(user_id)
                doc = doc_ref.get()
                if not doc.exists:
                    doc_ref.set(profile_data)
                    return profile_data
                return doc.to_dict()
            except Exception as exc:
                log.warning("Firestore create_profile failed: %s", exc)

        return self._mem_profiles.setdefault(user_id, profile_data)

    def update_profile(self, user_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
        if self.db is not None:
            try:
                doc_ref = self.db.collection("profiles").document(user_id)
                doc = doc_ref.get()
                if doc.exists:
                    update_data = {**fields, "updated_at": _now_iso()}
                    doc_ref.update(update_data)
                    updated_doc = doc_ref.get()
                    return updated_doc.to_dict() if updated_doc.exists else None
            except Exception as exc:
                log.warning("Firestore update_profile failed: %s", exc)

        if user_id not in self._mem_profiles:
            self.create_profile(user_id, email=fields.get("email"), full_name=fields.get("full_name"), avatar_url=fields.get("avatar_url"))
        self._mem_profiles[user_id].update({**fields, "updated_at": _now_iso()})
        return copy.deepcopy(self._mem_profiles.get(user_id))

    # --- reports -----------------------------------------------------
    def insert_report(self, user_id: str, row: dict[str, Any]) -> dict[str, Any]:
        report_id = str(uuid.uuid4())
        rec = {
            **copy.deepcopy(row),
            "id": report_id,
            "user_id": user_id,
            "created_at": row.get("created_at") or _now_iso(),
        }

        if self.db is not None:
            try:
                self.db.collection("reports").document(report_id).set(rec)
                return rec
            except Exception as exc:
                log.warning("Firestore insert_report failed: %s", exc)

        self._mem_reports.insert(0, rec)
        return rec

    def list_reports(self, user_id: str, *, limit: int) -> list[dict[str, Any]]:
        if self.db is not None:
            try:
                docs = self.db.collection("reports").where("user_id", "==", user_id).stream()
                items = [d.to_dict() for d in docs if d.exists]
                items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
                return items[:limit]
            except Exception as exc:
                log.warning("Firestore list_reports failed: %s", exc)

        return [r for r in self._mem_reports if r["user_id"] == user_id][:limit]
