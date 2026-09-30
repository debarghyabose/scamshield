"""API behaviour: auth, ownership isolation, validation and saving."""

from conftest import ALICE, ALICE_H, BOB_H

MSG = {"text": "Congratulations! You won a lottery. Click http://sbi-rewards-claim.xyz immediately"}


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_anonymous_scan_is_analysed_but_not_saved(client, db):
    r = client.post("/api/scan/message", json=MSG)
    assert r.status_code == 200
    body = r.json()
    assert body["risk_level"] == "DANGEROUS" and body["saved"] is False and body["id"] is None
    assert body["is_demo"] is False and body["thresholds"] == {"suspicious": 30, "dangerous": 70}
    assert db.scans == []


def test_authenticated_scan_is_saved_to_own_history(client, db):
    r = client.post("/api/scan/message", json=MSG, headers=ALICE_H)
    body = r.json()
    assert body["saved"] is True and body["id"]
    assert db.scans[0]["user_id"] == ALICE.id
    assert db.scans[0]["details"]["indicators"]


def test_save_false_is_respected(client, db):
    client.post("/api/scan/url", json={"url": "bit.ly/abc", "save": False}, headers=ALICE_H)
    assert db.scans == []


def test_user_id_in_body_is_rejected(client, db):
    r = client.post("/api/scan/message", json={**MSG, "user_id": "22222222-2222-2222-2222-222222222222"}, headers=ALICE_H)
    assert r.status_code == 422
    assert db.scans == []


def test_invalid_token_is_rejected_even_on_optional_endpoints(client):
    r = client.post("/api/scan/message", json=MSG, headers={"Authorization": "Bearer x.y.z"})
    assert r.status_code == 401
    assert "Session expired" in r.json()["detail"]
    assert client.post("/api/scan/message", json=MSG, headers={"Authorization": "Basic abc"}).status_code == 401


def test_protected_endpoints_require_auth(client):
    for method, path in [("get", "/api/scans"), ("get", "/api/scans/stats"), ("get", "/api/profile"), ("put", "/api/profile"),
                         ("post", "/api/report"), ("get", "/api/reports"), ("get", "/api/auth/session"),
                         ("get", "/api/scans/00000000-0000-0000-0000-000000000000")]:
        r = getattr(client, method)(path, json={}) if method in ("post", "put") else getattr(client, method)(path)
        assert r.status_code == 401, (method, path, r.status_code)


def test_history_isolation(client):
    a = client.post("/api/scan/message", json=MSG, headers=ALICE_H).json()
    client.post("/api/scan/url", json={"url": "https://www.wikipedia.org/"}, headers=BOB_H)

    alice_list = client.get("/api/scans", headers=ALICE_H).json()
    assert alice_list["total"] == 1 and alice_list["items"][0]["id"] == a["id"]

    # Bob can't read or delete Alice's scan — and gets the same 404 as for a missing scan.
    assert client.get(f"/api/scans/{a['id']}", headers=BOB_H).status_code == 404
    assert client.delete(f"/api/scans/{a['id']}", headers=BOB_H).status_code == 404
    assert client.get(f"/api/scans/{a['id']}", headers=ALICE_H).status_code == 200
    assert client.get("/api/scans/not-a-uuid", headers=ALICE_H).status_code == 404


def test_scan_detail_has_full_result(client):
    a = client.post("/api/scan/url", json={"url": "http://amaz0n-offers.shop/claim"}, headers=ALICE_H).json()
    d = client.get(f"/api/scans/{a['id']}", headers=ALICE_H).json()
    assert d["risk_level"] == a["risk_level"] and d["checks"] and d["input_text"] == "http://amaz0n-offers.shop/claim"


def test_filters_pagination_and_delete(client):
    for _ in range(3):
        client.post("/api/scan/message", json=MSG, headers=ALICE_H)
    client.post("/api/scan/message", json={"text": "See you at 8"}, headers=ALICE_H)
    r = client.get("/api/scans?risk_level=SAFE", headers=ALICE_H).json()
    assert r["total"] == 1
    r = client.get("/api/scans?limit=2&offset=0", headers=ALICE_H).json()
    assert len(r["items"]) == 2 and r["total"] == 4
    sid = r["items"][0]["id"]
    assert client.delete(f"/api/scans/{sid}", headers=ALICE_H).status_code == 204
    assert client.get("/api/scans", headers=ALICE_H).json()["total"] == 3


def test_stats(client):
    client.post("/api/scan/message", json=MSG, headers=ALICE_H)
    client.post("/api/scan/message", json={"text": "See you at 8"}, headers=ALICE_H)
    client.post("/api/scan/message", json=MSG, headers=BOB_H)
    s = client.get("/api/scans/stats?tz_offset_minutes=-330", headers=ALICE_H).json()
    assert s["total"] == 2
    assert s["by_level"]["DANGEROUS"] == 1 and s["by_level"]["SAFE"] == 1
    assert len(s["daily"]) == 14 and sum(d["DANGEROUS"] + d["SAFE"] + d["SUSPICIOUS"] for d in s["daily"]) == 2
    assert sum(s["histogram"]) == 2 and s["last_7_days"] == 2


def test_transaction_scan_and_validation(client):
    ok = {"amount": 24999, "average_amount": 1800, "payee_type": "new", "time": "21:40", "frequency_24h": 3, "flags": ["pay_to_receive"]}
    r = client.post("/api/scan/transaction", json=ok, headers=ALICE_H).json()
    assert r["scan_type"] == "payment" and r["input_text"].startswith("₹24,999")
    assert client.post("/api/scan/transaction", json={**ok, "time": "25:00"}).status_code == 422
    assert client.post("/api/scan/transaction", json={**ok, "amount": -1}).status_code == 422
    assert client.post("/api/scan/transaction", json={**ok, "flags": ["made_up"]}).status_code == 422


def test_url_validation_error_message(client):
    r = client.post("/api/scan/url", json={"url": "ftp://x.com"})
    assert r.status_code == 422 and "http" in r.json()["detail"]
    assert client.post("/api/scan/message", json={"text": "   "}).status_code == 422
    assert client.post("/api/scan/message", json={"text": "x" * 2001}).status_code == 422


def test_profile_created_and_updated(client):
    p = client.get("/api/profile", headers=ALICE_H).json()
    assert p["email"] == "alice@example.com" and p["full_name"] == "Alice" and p["provider"] == "email"
    r = client.put("/api/profile", json={"full_name": "  Alice Smith ", "theme": "dark", "notifications_enabled": False}, headers=ALICE_H)
    assert r.status_code == 200 and r.json()["full_name"] == "Alice Smith" and r.json()["theme"] == "dark"
    # email and user_id can't be changed through the API
    assert client.put("/api/profile", json={"email": "x@y.com"}, headers=ALICE_H).status_code == 422
    assert client.put("/api/profile", json={"user_id": "22222222-2222-2222-2222-222222222222"}, headers=ALICE_H).status_code == 422
    assert client.put("/api/profile", json={"full_name": ""}, headers=ALICE_H).status_code == 422
    assert client.put("/api/profile", json={"theme": "neon"}, headers=ALICE_H).status_code == 422


def test_avatar_url_must_be_own_folder_or_google(client, monkeypatch):
    import routers.profile as prof

    class S:
        supabase_url = "https://proj.supabase.co"
    monkeypatch.setattr(prof, "get_settings", lambda: S())
    own = f"https://proj.supabase.co/storage/v1/object/public/avatars/{ALICE.id}/avatar.png"
    other = "https://proj.supabase.co/storage/v1/object/public/avatars/22222222-2222-2222-2222-222222222222/a.png"
    assert client.put("/api/profile", json={"avatar_url": own}, headers=ALICE_H).status_code == 200
    assert client.put("/api/profile", json={"avatar_url": other}, headers=ALICE_H).status_code == 422
    assert client.put("/api/profile", json={"avatar_url": "https://evil.com/a.png"}, headers=ALICE_H).status_code == 422
    assert client.put("/api/profile", json={"avatar_url": "https://lh3.googleusercontent.com/a/xyz"}, headers=ALICE_H).status_code == 200


def test_reports(client, db):
    body = {"scam_type": "Phishing link", "content": "Got an SMS with a fake bank link", "phone_number": "+91 98765 43210",
            "url": "http://sbi-kyc-update.xyz", "description": ""}
    r = client.post("/api/report", json=body, headers=ALICE_H)
    assert r.status_code == 201
    out = r.json()
    assert out["reference"].startswith("SS-") and out["description"] is None
    assert db.reports[0]["user_id"] == ALICE.id
    assert client.get("/api/reports", headers=BOB_H).json() == []
    assert len(client.get("/api/reports", headers=ALICE_H).json()) == 1
    assert client.post("/api/report", json={**body, "scam_type": "Nonsense"}, headers=ALICE_H).status_code == 422
    assert client.post("/api/report", json={**body, "phone_number": "abc"}, headers=ALICE_H).status_code == 422
    assert client.post("/api/report", json={**body, "url": "ftp://x"}, headers=ALICE_H).status_code == 422
    assert client.post("/api/report", json={**body, "content": "short"}, headers=ALICE_H).status_code == 422


def test_rate_limit(client):
    from services.rate_limit import scan_limiter
    scan_limiter.limit = 3
    try:
        codes = [client.post("/api/scan/message", json={"text": "hello"}).status_code for _ in range(4)]
        assert codes == [200, 200, 200, 429]
    finally:
        scan_limiter.limit = 30


def test_cors_preflight(client):
    r = client.options("/api/scan/message", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
                                                     "Access-Control-Request-Headers": "authorization,content-type"})
    assert r.status_code == 200 and r.headers["access-control-allow-origin"] == "http://localhost:5173"
    r = client.options("/api/scan/message", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers
