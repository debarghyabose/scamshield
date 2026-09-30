"""POST /api/scan/transaction — pre-payment risk check."""

from fastapi import APIRouter, Depends, Request

from database.supabase import Database, get_optional_db
from models.schemas import ScanResult, TransactionScanIn
from routers.auth import AuthUser, get_optional_user
from services.rate_limit import client_key, scan_limiter
from services.scan_service import finalize_scan
from services.transaction_detector import analyze_transaction, describe_transaction

router = APIRouter(prefix="/api/scan", tags=["scan"])


def _db(request: Request) -> Database | None:
    return get_optional_db(request)


@router.post("/transaction", response_model=ScanResult)
def scan_transaction(
    body: TransactionScanIn,
    request: Request,
    user: AuthUser | None = Depends(get_optional_user),
    db: Database | None = Depends(_db),
) -> dict:
    scan_limiter.check(client_key(request, user.id if user else None))
    payload = body.model_dump(exclude={"save"})
    result = analyze_transaction(payload)
    return finalize_scan(
        scan_type="payment",
        input_text=describe_transaction(payload),
        result=result,
        request_details=payload,
        user=user,
        save=body.save,
        db=db,
    )
