"""FirebaseTokenVerifier tests."""

import asyncio
import base64
import json
import time

import pytest

from routers.auth import AuthUser, InvalidToken, FirebaseTokenVerifier, user_from_firebase


def make_token(exp_offset=3600, uid="u1"):
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
    return f"{enc({'alg': 'RS256'})}.{enc({'sub': uid, 'email': 'a@b.c', 'name': 'A', 'picture': 'p', 'exp': int(time.time()) + exp_offset})}.sig"


def test_user_from_firebase():
    decoded = {
        "uid": "u1",
        "email": "test@example.com",
        "name": "Test User",
        "picture": "http://example.com/pic.png",
        "firebase": {"sign_in_provider": "google.com"},
    }
    user = user_from_firebase(decoded)
    assert user.id == "u1"
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.avatar_url == "http://example.com/pic.png"
    assert user.provider == "google.com"


def test_token_verification_and_caching():
    v = FirebaseTokenVerifier(project_id="test-proj")
    tok = make_token()
    u = asyncio.run(v.verify(tok))
    assert u.id == "u1"
    assert u.email == "a@b.c"

    # Second call should return cached result
    u_cached = asyncio.run(v.verify(tok))
    assert u_cached.id == "u1"


def test_expired_token_rejected():
    v = FirebaseTokenVerifier(project_id="test-proj")
    with pytest.raises(InvalidToken):
        asyncio.run(v.verify(make_token(-10)))
