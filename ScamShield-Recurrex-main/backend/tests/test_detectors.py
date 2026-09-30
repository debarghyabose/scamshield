"""The rule engine: expected risk levels for representative inputs."""

import pytest

from services.message_detector import analyze_message
from services.transaction_detector import analyze_transaction
from services.url_detector import UrlValidationError, analyze_url, parse_url


@pytest.mark.parametrize("text,level", [
    ("Congratulations! You have won ₹50,000 in the SBI Lucky Draw. Click http://sbi-rewards-claim.xyz immediately to claim your reward.", "DANGEROUS"),
    ("Dear customer, your HDFC account will be blocked today due to pending KYC. Update PAN details now: bit.ly/hdfc-kyc-upd", "DANGEROUS"),
    ("India Post: Your parcel is on hold. Pay the ₹25 redelivery fee within 12 hours at indiapost-redelivery.info", "SUSPICIOUS"),
    ("Guaranteed 40% monthly returns. Join our VIP crypto trading group", "SUSPICIOUS"),
    ("Install AnyDesk so our executive can process your refund", "SUSPICIOUS"),
    ("Your OTP for login is 482913. It is valid for 10 minutes. Do not share it with anyone. -Team Zomato", "SAFE"),
    ("Hey, are we still on for dinner at 8? I booked a table near the station.", "SAFE"),
])
def test_message_levels(text, level):
    r = analyze_message(text)
    assert r["risk_level"] == level
    assert 0 <= r["risk_score"] <= 100
    assert r["recommendations"]


def test_message_is_deterministic():
    t = "You have received a cashback offer. Reply YES to activate"
    assert analyze_message(t)["risk_score"] == analyze_message(t)["risk_score"]


@pytest.mark.parametrize("url,level", [
    ("http://amaz0n-offers.shop/claim/gift?id=8812", "DANGEROUS"),
    ("https://secure-login.hdfc-netbanking-verify.com/kyc/update", "DANGEROUS"),
    ("bit.ly/3xRw9Kp", "SUSPICIOUS"),
    ("http://103.21.58.14/paytm/refund", "SUSPICIOUS"),
    ("http://user@evil.com/login", "SUSPICIOUS"),
    ("https://www.onlinesbi.sbi/", "SAFE"),
    ("https://www.wikipedia.org/", "SAFE"),
])
def test_url_levels(url, level):
    r = analyze_url(url)
    assert r["risk_level"] == level
    assert {c["id"] for c in r["checks"]} == {"pattern", "https", "mismatch", "blocklist", "keywords"}


@pytest.mark.parametrize("bad", ["", "not a url", "ftp://example.com", "http://", "exa_mple.com", "http://example.com:abc/"])
def test_url_validation(bad):
    with pytest.raises(UrlValidationError):
        parse_url(bad)


def test_unicode_domain_is_converted_to_punycode():
    r = analyze_url("https://аpple.com/")  # Cyrillic "а"
    assert r["analyzed"]["host"].startswith("xn--")
    assert r["risk_level"] != "SAFE"


def test_payment_without_behavioural_flags_is_never_dangerous():
    r = analyze_transaction({"amount": 9_000_000, "average_amount": 100, "payee_type": "new", "time": "02:00", "frequency_24h": 150, "flags": []})
    assert r["risk_level"] == "SUSPICIOUS"


def test_payment_levels():
    base = {"payee_type": "existing", "time": "13:05", "frequency_24h": 4}
    assert analyze_transaction({**base, "amount": 240, "average_amount": 450})["risk_level"] == "SAFE"
    scam = {"amount": 24999, "average_amount": 1800, "payee_type": "new", "time": "21:40", "frequency_24h": 3,
            "flags": ["contacted_first", "pay_to_receive", "urgency"]}
    r = analyze_transaction(scam)
    assert r["risk_level"] == "DANGEROUS"
    assert "Amount is 13.9× your usual" in r["reasons"][0] or "14×" in r["reasons"][0]


def test_indian_number_format():
    from services.risk_engine import format_inr, to_fixed_1
    assert format_inr(2500000) == "₹25,00,000"
    assert format_inr(999) == "₹999"
    assert to_fixed_1(2.25) == "2.3"
