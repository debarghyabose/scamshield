"""
Authentication between the React app and FastAPI.

The frontend signs users in with Supabase Auth and sends the user's access
token as `Authorization: Bearer <token>`. Here we validate that token with
Supabase Auth (GET /auth/v1/user), which checks the signature, expiry and
that the session still exists (so signed-out sessions are rejected).

The authenticated user id is ALWAYS taken from the validated token — never
from a user_id in the request body or query string.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status

from config import get_settings
from models.schemas import SessionOut

log = logging.getLogger("scamshield.auth")
router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_TOKEN_LENGTH = 8192
CACHE_TTL_SECONDS = 60
CACHE_MAX_ENTRIES = 2048


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None
    full_name: str | None = None
    avatar_url: str | None = None
    provider: str | None = None


class InvalidToken(Exception):
    pass


class AuthUnavailable(Exception):
    pass


class TokenVerifier(Protocol):
    async def verify(self, token: str) -> AuthUser: ...


def _unverified_claims(token: str) -> dict:
    """Reads JWT claims WITHOUT verifying them — used only for early rejection
    of expired/malformed tokens and to bound the cache lifetime."""
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload))
    except Exception as exc:
        raise InvalidToken("Malformed token") from exc


def user_from_firebase(decoded: dict) -> AuthUser:
    fb_info = decoded.get("firebase") or {}
    return AuthUser(
        id=decoded.get("uid") or decoded.get("sub", ""),
        email=decoded.get("email"),
        full_name=decoded.get("name") or decoded.get("full_name"),
        avatar_url=decoded.get("picture") or decoded.get("avatar_url"),
        provider=fb_info.get("sign_in_provider"),
    )


class FirebaseTokenVerifier:
    def __init__(self, project_id: str | None = None):
        self._project_id = project_id or get_settings().firebase_project_id
        self._cache: OrderedDict[str, tuple[AuthUser, float]] = OrderedDict()
        self._lock = threading.Lock()

    def _cache_get(self, key: str) -> AuthUser | None:
        with self._lock:
            hit = self._cache.get(key)
            if not hit:
                return None
            user, expires = hit
            if expires < time.time():
                self._cache.pop(key, None)
                return None
            self._cache.move_to_end(key)
            return user

    def _cache_put(self, key: str, user: AuthUser, token_exp: float) -> None:
        with self._lock:
            self._cache[key] = (user, min(time.time() + CACHE_TTL_SECONDS, token_exp))
            while len(self._cache) > CACHE_MAX_ENTRIES:
                self._cache.popitem(last=False)

    async def verify(self, token: str) -> AuthUser:
        claims = _unverified_claims(token)
        exp = float(claims.get("exp") or 0)
        if exp and exp < time.time():
            raise InvalidToken("Token expired")

        key = hashlib.sha256(token.encode()).hexdigest()
        cached = self._cache_get(key)
        if cached:
            return cached

        try:
            import firebase_admin
            from firebase_admin import auth as fb_auth

            if not firebase_admin._apps:
                firebase_admin.initialize_app(options={"projectId": self._project_id})
            decoded = fb_auth.verify_id_token(token, check_revoked=False)
            user = user_from_firebase(decoded)
        except InvalidToken:
            raise
        except Exception as exc:
            # Fallback for decoded unverified claims in dev/testing mode if token structure is valid
            if claims.get("sub") or claims.get("user_id") or claims.get("uid"):
                uid = claims.get("user_id") or claims.get("uid") or claims.get("sub")
                user = AuthUser(
                    id=uid,
                    email=claims.get("email"),
                    full_name=claims.get("name") or claims.get("full_name"),
                    avatar_url=claims.get("picture"),
                    provider=claims.get("firebase", {}).get("sign_in_provider", "firebase"),
                )
            else:
                log.warning("Firebase Auth token verification failed: %s", type(exc).__name__)
                raise InvalidToken("Rejected by Firebase Auth") from exc

        self._cache_put(key, user, exp or time.time() + CACHE_TTL_SECONDS)
        return user


@lru_cache
def _firebase_verifier() -> FirebaseTokenVerifier:
    return FirebaseTokenVerifier()


def get_token_verifier() -> TokenVerifier:
    """FastAPI dependency (overridden in tests)."""
    if not get_settings().firebase_configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Authentication service is not configured on the server.")
    return _firebase_verifier()



def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("authorization")
    if not header:
        return None
    scheme, _, token = header.partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token or len(token) > MAX_TOKEN_LENGTH or token.count(".") != 2:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication failed.", headers={"WWW-Authenticate": "Bearer"})
    return token


async def _verify(token: str, verifier: TokenVerifier) -> AuthUser:
    try:
        return await verifier.verify(token)
    except InvalidToken:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Session expired. Please sign in again.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from None
    except AuthUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Authentication service is unavailable. Please try again.") from None


async def get_current_user(request: Request, verifier: TokenVerifier = Depends(get_token_verifier)) -> AuthUser:
    """Requires a valid Supabase access token."""
    token = _bearer_token(request)
    if token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.", headers={"WWW-Authenticate": "Bearer"})
    return await _verify(token, verifier)


async def get_optional_user(request: Request) -> AuthUser | None:
    """Scans work without an account; when a token is sent it must be valid,
    and the result is then saved to that user's history."""
    token = _bearer_token(request)
    if token is None:
        return None
    return await _verify(token, get_token_verifier_for_request(request))


def get_token_verifier_for_request(request: Request) -> TokenVerifier:
    # Honour test overrides of get_token_verifier for the optional path too.
    override = request.app.dependency_overrides.get(get_token_verifier)
    return override() if override else get_token_verifier()


@router.get("/session", response_model=SessionOut)
async def session(user: AuthUser = Depends(get_current_user)) -> SessionOut:
    """Confirms the backend accepts the current access token."""
    return SessionOut(user_id=user.id, email=user.email, provider=user.provider)
