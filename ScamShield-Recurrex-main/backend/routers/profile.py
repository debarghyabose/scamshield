"""GET /api/profile and PUT /api/profile for the signed-in user."""

from __future__ import annotations

from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, status

from config import get_settings
from database.supabase import Database, get_db
from models.schemas import ProfileOut, ProfileUpdate
from routers.auth import AuthUser, get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

TRUSTED_AVATAR_HOSTS = ("googleusercontent.com",)


def _check_avatar_url(url: str, user_id: str) -> None:
    """Only accept avatars stored in this user's own folder of the avatars
    bucket, or Google profile photos."""
    own_prefix = f"{get_settings().supabase_url}/storage/v1/object/public/avatars/{user_id}/"
    if url.startswith(own_prefix) and ".." not in url:
        return
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if parts.scheme == "https" and any(host == h or host.endswith("." + h) for h in TRUSTED_AVATAR_HOSTS):
        return
    raise HTTPException(422, "Profile picture must be uploaded through ScamShield.")


def _ensure_profile(user: AuthUser, db: Database) -> dict:
    profile = db.get_profile(user.id)
    if profile is None:
        # Normally created by the database trigger on sign-up; this covers
        # accounts that existed before the migration was applied.
        profile = db.create_profile(user.id, email=user.email, full_name=user.full_name, avatar_url=user.avatar_url)
    return profile


@router.get("", response_model=ProfileOut)
def get_profile(user: AuthUser = Depends(get_current_user), db: Database = Depends(get_db)) -> ProfileOut:
    return ProfileOut(**_ensure_profile(user, db), provider=user.provider)


@router.put("", response_model=ProfileOut)
def update_profile(body: ProfileUpdate, user: AuthUser = Depends(get_current_user), db: Database = Depends(get_db)) -> ProfileOut:
    fields = body.model_dump(exclude_unset=True)
    if "full_name" in fields and fields["full_name"] is None:
        raise HTTPException(422, "Name can’t be empty.")
    for key in ("theme", "notifications_enabled", "language"):
        if key in fields and fields[key] is None:
            fields.pop(key)
    if fields.get("avatar_url"):
        _check_avatar_url(fields["avatar_url"], user.id)
    _ensure_profile(user, db)
    if not fields:
        return ProfileOut(**db.get_profile(user.id), provider=user.provider)
    updated = db.update_profile(user.id, fields)
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found.")
    return ProfileOut(**updated, provider=user.provider)
