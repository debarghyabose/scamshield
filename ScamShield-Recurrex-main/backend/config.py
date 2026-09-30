"""Backend settings, read from environment variables (or a local .env file)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _csv(value: str) -> list[str]:
    return [v.strip().rstrip("/") for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    firebase_project_id: str = field(default_factory=lambda: os.getenv("FIREBASE_PROJECT_ID", os.getenv("VITE_FIREBASE_PROJECT_ID", "angmi-8d81b")))
    firebase_service_account_path: str = field(default_factory=lambda: os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", ""))
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", "").rstrip("/"))
    supabase_service_role_key: str = field(default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
    allowed_origins: list[str] = field(
        default_factory=lambda: _csv(os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081"))
    )
    scan_rate_limit_per_minute: int = field(default_factory=lambda: int(os.getenv("SCAN_RATE_LIMIT_PER_MINUTE", "30")))
    report_rate_limit_per_hour: int = field(default_factory=lambda: int(os.getenv("REPORT_RATE_LIMIT_PER_HOUR", "20")))

    @property
    def firebase_configured(self) -> bool:
        return bool(self.firebase_project_id)

    @property
    def supabase_configured(self) -> bool:
        return self.firebase_configured


@lru_cache
def get_settings() -> Settings:
    return Settings()

