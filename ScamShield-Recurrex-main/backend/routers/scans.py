"""Private scan history: GET /api/scans, /api/scans/stats, /api/scans/{id}; DELETE /api/scans/{id}."""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from database.supabase import Database, get_db
from models.schemas import DailyCount, ScanList, ScanResult, ScanStats
from routers.auth import AuthUser, get_current_user
from services.risk_engine import THRESHOLDS

router = APIRouter(prefix="/api/scans", tags=["history"])

LEVELS = ("SAFE", "SUSPICIOUS", "DANGEROUS")


def _valid_id(scan_id: str) -> str:
    try:
        return str(uuid.UUID(scan_id))
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found.") from None


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("", response_model=ScanList)
def list_scans(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, le=100_000),
    scan_type: Literal["message", "url", "payment"] | None = None,
    risk_level: Literal["SAFE", "SUSPICIOUS", "DANGEROUS"] | None = None,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> ScanList:
    items, total = db.list_scans(user.id, limit=limit, offset=offset, scan_type=scan_type, risk_level=risk_level)
    return ScanList(items=items, total=total, limit=limit, offset=offset)


@router.get("/stats", response_model=ScanStats)
def scan_stats(
    tz_offset_minutes: int = Query(0, ge=-840, le=840, description="Browser Date#getTimezoneOffset()"),
    days: int = Query(14, ge=7, le=90),
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> ScanStats:
    max_rows = 10_000
    rows = db.scan_stats_rows(user.id, max_rows=max_rows)
    offset = timedelta(minutes=-tz_offset_minutes)  # local = utc + offset
    now_local = datetime.now(timezone.utc) + offset
    today = now_local.date()
    day_keys = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    daily = {k: DailyCount(date=k) for k in day_keys}

    by_level = Counter({lvl: 0 for lvl in LEVELS})
    by_type = Counter({t: 0 for t in ("message", "url", "payment")})
    histogram = [0] * 10
    categories: Counter[str] = Counter()
    last7 = prev7 = 0
    now_utc = datetime.now(timezone.utc)

    for r in rows:
        level = r["risk_level"]
        by_level[level] += 1
        by_type[r["scan_type"]] += 1
        histogram[min(9, max(0, int(r["risk_score"]) // 10))] += 1
        if level != "SAFE" and r.get("category") and r["category"] != "No known pattern":
            categories[r["category"]] += 1
        created = _parse_ts(r["created_at"])
        key = (created + offset).date().isoformat()
        if key in daily:
            setattr(daily[key], level, getattr(daily[key], level) + 1)
        age = now_utc - created
        if age <= timedelta(days=7):
            last7 += 1
        elif age <= timedelta(days=14):
            prev7 += 1

    return ScanStats(
        total=len(rows),
        by_level=dict(by_level),
        by_type=dict(by_type),
        daily=list(daily.values()),
        histogram=histogram,
        top_categories=categories.most_common(6),
        last_7_days=last7,
        previous_7_days=prev7,
        truncated=len(rows) >= max_rows,
    )


@router.get("/{scan_id}", response_model=ScanResult)
def get_scan(scan_id: str, user: AuthUser = Depends(get_current_user), db: Database = Depends(get_db)) -> dict:
    row = db.get_scan(user.id, _valid_id(scan_id))
    if row is None:
        # Same response whether the scan doesn't exist or belongs to someone else.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found.")
    details = row.get("details") or {}
    return {
        "id": row["id"],
        "saved": True,
        "scan_type": row["scan_type"],
        "input_text": row["input_text"],
        "risk_level": row["risk_level"],
        "risk_score": row["risk_score"],
        "reasons": row.get("reasons") or [],
        "recommendations": row.get("recommendations") or [],
        "summary": row.get("summary"),
        "category": row.get("category"),
        "indicators": details.get("indicators", []),
        "checks": details.get("checks", []),
        "engine": row.get("engine") or "unknown",
        "is_demo": False,
        "thresholds": dict(THRESHOLDS),
        "scanned_at": row["created_at"],
    }


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(scan_id: str, user: AuthUser = Depends(get_current_user), db: Database = Depends(get_db)) -> Response:
    if not db.delete_scan(user.id, _valid_id(scan_id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
