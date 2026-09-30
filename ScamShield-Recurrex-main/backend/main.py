"""
ScamShield API (FastAPI).

Run locally:
    uvicorn main:app --reload
Docs (dev):  http://localhost:8000/docs
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from database.supabase import DatabaseError, DatabaseNotConfigured
from routers import auth, message, profile, reports, scans, transaction, url
from services.risk_engine import ENGINE_VERSION

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
# Request URLs to Supabase contain user ids; keep them out of routine logs.
logging.getLogger("httpx").setLevel(logging.WARNING)

settings = get_settings()

app = FastAPI(
    title="ScamShield API",
    version="1.0.0",
    description="Rule-based scam and fraud risk analysis for messages, links and payments.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,  # auth uses the Authorization header, not cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("X-Frame-Options", "DENY")
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "request"
    msg = str(first.get("msg", "Invalid request")).removeprefix("Value error, ")
    return JSONResponse(
        status_code=422,
        content={"detail": f"{field}: {msg}", "errors": [{"loc": e.get("loc"), "msg": e.get("msg")} for e in errors]},
    )


@app.exception_handler(DatabaseNotConfigured)
async def db_not_configured_handler(request: Request, exc: DatabaseNotConfigured):
    return JSONResponse(status_code=503, content={"detail": "The database is not configured on the server."})


@app.exception_handler(DatabaseError)
async def db_error_handler(request: Request, exc: DatabaseError):
    return JSONResponse(status_code=503, content={"detail": "The database is temporarily unavailable. Please try again."})


for r in (auth.router, message.router, url.router, transaction.router, scans.router, reports.router, profile.router):
    app.include_router(r)


@app.post("/api/scan-message", tags=["scan"])
def scan_message_alias(payload: dict):
    from services.message_detector import analyze_message
    from services.ml_service import predict_message_scam
    text = payload.get("content") or payload.get("text") or ""
    res = analyze_message(text)
    ml_res = predict_message_scam(text)
    return {
        "sender": payload.get("sender", "unknown"),
        "risk_level": res["risk_level"].capitalize(),
        "risk_score": res["risk_score"],
        "summary": res["summary"],
        "reasons": res["reasons"],
        "urls": res.get("links", []),
        "is_spam": ml_res.get("is_spam", False),
        "ml_confidence": ml_res.get("confidence", 0.0),
    }


@app.post("/api/score-transaction", tags=["scan"])
def score_transaction_alias(payload: dict):
    from services.transaction_detector import analyze_transaction
    amount = float(payload.get("amount", 0))
    res = analyze_transaction(amount=amount)
    return {
        "risk_level": res["risk_level"],
        "risk_score": res["risk_score"],
        "summary": res["summary"],
        "reasons": res["reasons"],
    }


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "engine": ENGINE_VERSION, "supabase_configured": settings.supabase_configured, "ml_model_active": True}

