"""POST /api/scan/url — analyse a link as text (it is never opened)."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from database.supabase import Database, get_optional_db
from models.schemas import ScanResult, UrlScanIn
from routers.auth import AuthUser, get_optional_user
from services.rate_limit import client_key, scan_limiter
from services.scan_service import finalize_scan
from services.url_detector import UrlValidationError, analyze_url

router = APIRouter(prefix="/api/scan", tags=["scan"])


def _db(request: Request) -> Database | None:
    return get_optional_db(request)


@router.post("/url", response_model=ScanResult)
def scan_url(
    body: UrlScanIn,
    request: Request,
    user: AuthUser | None = Depends(get_optional_user),
    db: Database | None = Depends(_db),
) -> dict:
    scan_limiter.check(client_key(request, user.id if user else None))
    try:
        result = analyze_url(body.url)
    except UrlValidationError as exc:
        raise HTTPException(422, str(exc)) from None
    return finalize_scan(
        scan_type="url",
        input_text=body.url,
        result=result,
        request_details={"analyzed": result.get("analyzed", {})},
        user=user,
        save=body.save,
        db=db,
    )
