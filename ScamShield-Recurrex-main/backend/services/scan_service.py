"""Glue between the detectors, the response envelope and scan history storage."""

from __future__ import annotations

import logging
from typing import Any

from database.supabase import Database, DatabaseError
from routers.auth import AuthUser

from .risk_engine import envelope

log = logging.getLogger("scamshield.scans")


def finalize_scan(
    *,
    scan_type: str,
    input_text: str,
    result: dict[str, Any],
    request_details: dict[str, Any],
    user: AuthUser | None,
    save: bool,
    db: Database | None,
) -> dict[str, Any]:
    """Wraps a detector result and, for signed-in users, saves it to history."""
    out = envelope(scan_type, result)
    out["input_text"] = input_text
    if not (user and save):
        return out
    if db is None:
        out["save_error"] = "Scan history storage isn’t configured on the server."
        return out
    try:
        row = db.insert_scan(
            user.id,
            {
                "scan_type": scan_type,
                "input_text": input_text[:4000],
                "risk_level": out["risk_level"],
                "risk_score": out["risk_score"],
                "reasons": out["reasons"],
                "recommendations": out["recommendations"],
                "summary": out.get("summary"),
                "category": out.get("category"),
                "engine": out["engine"],
                "details": {
                    "indicators": out.get("indicators", []),
                    "checks": out.get("checks", []),
                    "request": request_details,
                },
            },
        )
        out.update(id=row["id"], saved=True, scanned_at=row.get("created_at", out["scanned_at"]))
    except DatabaseError:
        log.warning("Could not save %s scan to history", scan_type)
        out["save_error"] = "The result couldn’t be saved to your history. Please try again later."
    return out
