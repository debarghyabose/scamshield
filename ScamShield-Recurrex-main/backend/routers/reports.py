"""Scam reports: POST /api/report, GET /api/reports (the signed-in user's own reports)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from database.supabase import Database, get_db
from models.schemas import ReportIn, ReportOut
from routers.auth import AuthUser, get_current_user
from services.rate_limit import client_key, report_limiter
from services.url_detector import UrlValidationError, parse_url

router = APIRouter(prefix="/api", tags=["reports"])


def _out(row: dict) -> ReportOut:
    return ReportOut(**row, reference="SS-" + str(row["id"]).replace("-", "")[:8].upper())


@router.post("/report", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_report(
    body: ReportIn,
    request: Request,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> ReportOut:
    report_limiter.check(client_key(request, user.id))
    if body.url:
        try:
            parse_url(body.url)
        except UrlValidationError as exc:
            raise HTTPException(422, f"URL: {exc}") from None
    row = db.insert_report(user.id, body.model_dump())
    return _out(row)


@router.get("/reports", response_model=list[ReportOut])
def my_reports(
    limit: int = Query(10, ge=1, le=50),
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> list[ReportOut]:
    return [_out(r) for r in db.list_reports(user.id, limit=limit)]
