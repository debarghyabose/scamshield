"""Request and response models for the ScamShield API."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RiskLevel = Literal["SAFE", "SUSPICIOUS", "DANGEROUS"]
ScanType = Literal["message", "url", "payment"]

SCAM_TYPES = [
    "Prize / lottery",
    "Phishing link",
    "Fake KYC / bank",
    "UPI collect request",
    "Job / task scam",
    "Investment / crypto",
    "Delivery / courier",
    "Impersonation",
    "Other",
]

PHONE_RE = re.compile(r"^\+?[\d\s()-]{8,16}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# ----------------------------------------------------------------- scans
class MessageScanIn(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    save: bool = True


class UrlScanIn(StrictModel):
    url: str = Field(min_length=1, max_length=2048)
    save: bool = True


PaymentFlag = Literal["contacted_first", "pay_to_receive", "urgency", "otp_request", "remote_app", "unknown_qr"]


class TransactionScanIn(StrictModel):
    amount: float = Field(gt=0, le=10_000_000)
    average_amount: float = Field(gt=0, le=10_000_000)
    payee_type: Literal["new", "existing"]
    time: str
    frequency_24h: int = Field(ge=0, le=200)
    flags: list[PaymentFlag] = Field(default_factory=list, max_length=10)
    save: bool = True

    @field_validator("time")
    @classmethod
    def _time(cls, v: str) -> str:
        if not TIME_RE.match(v):
            raise ValueError("Time must be in HH:MM format.")
        return v


class Indicator(BaseModel):
    label: str
    detail: str | None = None
    severity: str = "medium"
    id: str | None = None


class Check(BaseModel):
    id: str
    label: str
    status: Literal["pass", "warn", "fail", "info"]
    detail: str


class ScanResult(BaseModel):
    risk_level: RiskLevel
    risk_score: int = Field(ge=0, le=100)
    reasons: list[str]
    recommendations: list[str]
    summary: str | None = None
    category: str | None = None
    indicators: list[Indicator] = Field(default_factory=list)
    checks: list[Check] = Field(default_factory=list)
    scan_type: ScanType
    engine: str
    is_demo: bool = False
    thresholds: dict[str, int]
    scanned_at: datetime
    # Set when the result was saved to the signed-in user's history.
    id: str | None = None
    saved: bool = False
    save_error: str | None = None
    input_text: str | None = None


class ScanListItem(BaseModel):
    id: str
    scan_type: ScanType
    input_text: str
    risk_level: RiskLevel
    risk_score: int
    category: str | None = None
    summary: str | None = None
    created_at: datetime


class ScanList(BaseModel):
    items: list[ScanListItem]
    total: int
    limit: int
    offset: int


class DailyCount(BaseModel):
    date: str
    SAFE: int = 0
    SUSPICIOUS: int = 0
    DANGEROUS: int = 0


class ScanStats(BaseModel):
    total: int
    by_level: dict[str, int]
    by_type: dict[str, int]
    daily: list[DailyCount]
    histogram: list[int]
    top_categories: list[tuple[str, int]]
    last_7_days: int
    previous_7_days: int
    truncated: bool = False


# --------------------------------------------------------------- reports
class ReportIn(StrictModel):
    scam_type: str
    content: str = Field(min_length=10, max_length=2000)
    phone_number: str | None = Field(default=None, max_length=32)
    url: str | None = Field(default=None, max_length=2048)
    description: str | None = Field(default=None, max_length=1000)

    @field_validator("scam_type")
    @classmethod
    def _scam_type(cls, v: str) -> str:
        if v not in SCAM_TYPES:
            raise ValueError("Choose a scam type from the list.")
        return v

    @field_validator("phone_number", "url", "description", mode="before")
    @classmethod
    def _blank_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("phone_number")
    @classmethod
    def _phone(cls, v: str | None) -> str | None:
        if v is not None and not PHONE_RE.match(v):
            raise ValueError("Enter a valid phone number, e.g. +91 98765 43210.")
        return v


class ReportOut(BaseModel):
    id: str
    reference: str
    scam_type: str
    content: str
    phone_number: str | None = None
    url: str | None = None
    description: str | None = None
    created_at: datetime


# --------------------------------------------------------------- profile
class ProfileOut(BaseModel):
    id: str
    user_id: str
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    theme: Literal["light", "dark", "system"] = "system"
    notifications_enabled: bool = True
    language: Literal["en", "hi", "bn"] = "en"
    provider: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


class ProfileUpdate(StrictModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=1024)
    theme: Literal["light", "dark", "system"] | None = None
    notifications_enabled: bool | None = None
    language: Literal["en", "hi", "bn"] | None = None


class SessionOut(BaseModel):
    user_id: str
    email: str | None = None
    provider: str | None = None
