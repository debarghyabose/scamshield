"""
Tiny in-memory sliding-window rate limiter.

Good enough for a single backend process. If you run several workers or
instances, move this to a shared store (e.g. Redis) or your API gateway.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= now - self.window:
                q.popleft()
            if len(q) >= self.limit:
                retry = max(1, int(self.window - (now - q[0])))
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Too many requests. Please wait a moment and try again.",
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)
            if len(self._hits) > 50_000:  # keep memory bounded
                for k in [k for k, v in self._hits.items() if not v][:10_000]:
                    self._hits.pop(k, None)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def client_key(request: Request, user_id: str | None) -> str:
    if user_id:
        return f"user:{user_id}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


def _build():
    from config import get_settings

    s = get_settings()
    return RateLimiter(s.scan_rate_limit_per_minute, 60), RateLimiter(s.report_rate_limit_per_hour, 3600)


scan_limiter, report_limiter = _build()
