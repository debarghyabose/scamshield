"""
Payment / transaction risk detector.

Compares a payment the user is about to make with their usual behaviour and
with the behaviour they report (e.g. "pay to receive a refund").

Design rule: amount, time and frequency on their own are *context*, not
evidence of fraud. Without a behavioural red flag a payment can reach
SUSPICIOUS at most — never DANGEROUS.
"""

from __future__ import annotations

from .risk_engine import clamp, dedupe, format_inr, js_round, level_from_score, to_fixed_1

PAYMENT_FLAGS = [
    {"id": "contacted_first", "label": "The payee contacted me first", "weight": 10},
    {"id": "pay_to_receive", "label": "I’m told to pay or scan a QR code to receive money", "weight": 30},
    {"id": "urgency", "label": "The payee is pressuring me to pay quickly", "weight": 12},
    {"id": "otp_request", "label": "The payee asked for my OTP or UPI PIN", "weight": 35},
    {"id": "remote_app", "label": "I was asked to install a screen-sharing app", "weight": 30},
    {"id": "unknown_qr", "label": "Payment is via a QR code or collect request I didn’t expect", "weight": 14},
]
PAYMENT_FLAG_IDS = {f["id"] for f in PAYMENT_FLAGS}


def _ratio_text(ratio: float) -> str:
    return str(js_round(ratio)) if ratio >= 10 else to_fixed_1(ratio)


def analyze_transaction(data: dict) -> dict:
    amount = float(data["amount"])
    avg = float(data["average_amount"])
    freq = int(data["frequency_24h"])
    flags = set(data.get("flags") or [])
    payee_type = data.get("payee_type", "new")
    if not amount > 0:
        raise ValueError("Enter a transaction amount greater than zero.")
    if not avg > 0:
        raise ValueError("Enter your average transaction amount.")

    indicators: list[dict] = []
    score = 5
    behavioural = 0

    ratio = amount / avg
    if ratio >= 5:
        score += 16
        indicators.append({
            "label": f"Amount is {_ratio_text(ratio)}× your usual",
            "detail": f"{format_inr(amount)} vs a typical {format_inr(avg)}. Large payments are normal sometimes; this is context, not proof.",
            "severity": "medium",
        })
    elif ratio >= 2:
        score += 7
        indicators.append({
            "label": f"Amount is {to_fixed_1(ratio)}× your usual",
            "detail": "Moderately higher than normal.",
            "severity": "low",
        })

    if payee_type == "new":
        score += 9
        indicators.append({"label": "First payment to this payee", "detail": "You have no payment history with them.", "severity": "low"})
        if ratio >= 3:
            score += 10
            indicators.append({
                "label": "Large first payment to a new payee",
                "detail": "Most payment fraud involves a new payee and an unusual amount together.",
                "severity": "medium",
            })

    try:
        hour = int(str(data.get("time") or "12:00").split(":")[0])
    except ValueError:
        hour = 12
    if 0 <= hour < 5:
        score += 5
        indicators.append({
            "label": "Late-night payment",
            "detail": "Unusual hours alone are weak evidence — many genuine payments happen at night.",
            "severity": "info",
        })

    if freq >= 10:
        score += 14
        indicators.append({
            "label": f"{freq} payments in the last 24 hours",
            "detail": "A burst of payments can indicate someone is being coached through repeated transfers.",
            "severity": "medium",
        })
    elif freq >= 6:
        score += 8
        indicators.append({"label": f"{freq} payments in the last 24 hours", "detail": "Higher than typical daily activity.", "severity": "low"})

    for flag in PAYMENT_FLAGS:
        if flag["id"] in flags:
            score += flag["weight"]
            behavioural += flag["weight"]
            indicators.append({"label": flag["label"], "severity": "high" if flag["weight"] >= 25 else "medium"})

    # Amount / time / frequency alone never push a payment into the highest band.
    if behavioural == 0:
        score = min(score, 58)
    score = int(clamp(js_round(score), 2, 97))
    risk_level = level_from_score(score)

    recs: list[str] = []
    if "otp_request" in flags:
        recs.append("Stop. Never share your OTP or UPI PIN — no genuine payee needs it.")
    if "pay_to_receive" in flags:
        recs.append("You never need to enter your PIN or scan a QR code to receive money.")
    if "remote_app" in flags:
        recs.append("Uninstall any screen-sharing app you were told to install and restart your phone.")
    if payee_type == "new" and risk_level != "SAFE":
        recs.append("Confirm the payee’s identity through a channel you already trust.")
    if ratio >= 3 and risk_level != "SAFE":
        recs.append("Try sending a small amount first, or wait an hour before a large transfer.")
    if risk_level != "SAFE":
        recs.append("If you’ve already paid, call 1930 or your bank immediately — speed matters.")
    if risk_level == "SAFE":
        recs.append("Looks consistent with your usual activity. Double-check the payee name before confirming.")

    if risk_level == "DANGEROUS":
        summary = "This request matches patterns commonly seen in payment scams, especially the behaviour you described."
    elif risk_level == "SUSPICIOUS":
        summary = (
            "Some details match common scam tactics. Pause and verify before paying."
            if behavioural
            else "This payment is unusual compared with your history. That isn’t fraud by itself, but it’s worth a second look."
        )
    else:
        summary = "Nothing here stands out compared with your usual activity."

    return {
        "risk_level": risk_level,
        "risk_score": score,
        "reasons": [i["label"] for i in indicators] if indicators else ["Consistent with your usual activity"],
        "recommendations": dedupe(recs)[:5],
        "summary": summary,
        "indicators": indicators,
        "category": "Payment scam tactics" if behavioural else ("No known pattern" if risk_level == "SAFE" else "Unusual activity"),
    }


def describe_transaction(data: dict) -> str:
    """Short human-readable description stored as the scan's input_text."""
    payee = "new payee" if data.get("payee_type") == "new" else "existing payee"
    return f"{format_inr(float(data['amount']))} · {payee} · {data.get('time', '')}".strip(" ·")
