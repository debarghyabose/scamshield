"""POST /api/scan/message — analyse SMS / WhatsApp / email text."""

from fastapi import APIRouter, Depends, Request

from database.supabase import Database, get_optional_db
from models.schemas import MessageScanIn, ScanResult
from routers.auth import AuthUser, get_optional_user
from services.message_detector import analyze_message
from services.rate_limit import client_key, scan_limiter
from services.scan_service import finalize_scan

router = APIRouter(prefix="/api/scan", tags=["scan"])


def _db(request: Request) -> Database | None:
    return get_optional_db(request)


@router.post("/message", response_model=ScanResult)
def scan_message(
    body: MessageScanIn,
    request: Request,
    user: AuthUser | None = Depends(get_optional_user),
    db: Database | None = Depends(_db),
) -> dict:
    scan_limiter.check(client_key(request, user.id if user else None))
    result = analyze_message(body.text)
    return finalize_scan(
        scan_type="message",
        input_text=body.text,
        result=result,
        request_details={"links": result.get("links", [])},
        user=user,
        save=body.save,
        db=db,
    )
