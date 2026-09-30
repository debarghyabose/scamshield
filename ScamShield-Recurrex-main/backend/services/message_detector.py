"""
Message risk detector (SMS / WhatsApp / email text).

Weighted pattern rules for the language scammers use — prize bait, urgency,
credential requests, threats, impersonation, fee requests, job/investment
pitches, remote-access requests — plus analysis of any links in the text.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .risk_engine import THRESHOLDS, clamp, dedupe, js_round, level_from_score, stable_hash
from .url_detector import UrlValidationError, analyze_url
from .ml_service import predict_message_scam

_F = re.I | re.A  # case-insensitive, ASCII word boundaries (matches the original JS rules)

# Minimum score when any high-severity rule fires, so one strong signal can't
# be scored as SAFE just because nothing else matched.
HIGH_SEVERITY_FLOOR = 36


@dataclass(frozen=True)
class Rule:
    id: str
    label: str
    detail: str
    pattern: re.Pattern
    weight: int
    severity: str
    category: str | None = None


MESSAGE_RULES: list[Rule] = [
    Rule(
        "prize", "Prize or reward language",
        "Unexpected winnings, cashback or gifts are the most common scam opener.",
        re.compile(r"\b(congratulations|congrats|you(?:'ve| have)? won|winner|lottery|lucky draw|prize|reward|cash ?back|gift (?:card|voucher)|jackpot)\b", _F),
        22, "high", "Prize / lottery",
    ),
    Rule(
        "urgency", "Urgent call to action",
        "Time pressure stops people from checking whether a message is real.",
        re.compile(r"\b(immediately|urgent(?:ly)?|right now|act now|last chance|final (?:notice|warning|reminder)|expir(?:e|es|ing|y)|within \d+\s*(?:hours?|hrs?|minutes?|mins?)|today only|asap|in \d+\s*(?:hours?|hrs?|minutes?|mins?))\b", _F),
        16, "medium",
    ),
    Rule(
        "click", "Request for immediate interaction",
        "Pushes you to click, tap or reply before thinking.",
        re.compile(r"\b(click|tap|open)\b[^.!?]{0,20}\b(link|here|below|now)\b|\breply (?:yes|with)\b", _F),
        8, "medium",
    ),
    Rule(
        "credentials", "Asks for OTP, PIN or account details",
        "Banks, UPI apps and government services never ask for these over SMS or chat.",
        re.compile(r"\b(otp|one[- ]time password|upi pin|pin|cvv|password|net ?banking|card (?:number|details)|aadhaar|pan (?:card|number)|kyc)\b", _F),
        26, "high", "KYC / bank impersonation",
    ),
    Rule(
        "threat", "Threat of account block or penalty",
        "Fear of losing access is used to rush a response.",
        re.compile(r"\b(blocked|suspended|deactivated|frozen|will be closed|legal action|penalty|arrest(?:ed)?|disconnected|terminated)\b", _F),
        18, "high",
    ),
    Rule(
        "impersonation", "Claims to be a bank, wallet or authority",
        "Scammers borrow trusted names. Verify through the official app or website.",
        re.compile(r"\b(sbi|hdfc|icici|axis bank|kotak|rbi|reserve bank|npci|paytm|phonepe|google ?pay|gpay|bhim|income tax|customs|trai|cbi|police|cyber cell|electricity|fedex|dhl|india post|courier)\b", _F),
        12, "medium", "Impersonation",
    ),
    Rule(
        "payment", "Requests a payment or fee",
        "Paying a “fee” to receive money is a classic advance-fee scam.",
        re.compile(r"\b(pay|send|transfer|deposit)\b[^.]{0,40}(₹|rs\.?|inr|rupees)|\b(processing|registration|delivery|clearance|release|verification) (?:fee|charge)s?\b", _F),
        14, "medium",
    ),
    Rule(
        "job", "Unrealistic job or income offer",
        "Easy money for simple tasks usually leads to “deposit to withdraw” demands.",
        re.compile(r"\b(work from home|no experience (?:needed|required)?|part[- ]time (?:job|work)|earn\s*(?:₹|rs\.?|inr)?\s?\d[\d,]*\s*(?:daily|per day|/day|a day)|like (?:youtube )?videos|task[- ]based|telegram task|rate products)\b", _F),
        22, "high", "Job / task scam",
    ),
    Rule(
        "investment", "Guaranteed-return investment pitch",
        "No legitimate investment can guarantee high returns.",
        re.compile(r"\b(guaranteed returns?|double your money|\d+% (?:daily|weekly|monthly) returns?|crypto (?:trading|signals)|stock tips|ipo allotment|vip group)\b", _F),
        22, "high", "Investment scam",
    ),
    Rule(
        "remote", "Asks to install a screen-sharing app",
        "Remote-access apps let a caller see your OTPs and control your phone.",
        re.compile(r"\b(anydesk|teamviewer|quick ?support|rustdesk|screen ?shar(?:e|ing)|\.apk|apk file)\b", _F),
        26, "high", "Remote access",
    ),
    Rule(
        "offplatform", "Moves the conversation to Telegram or WhatsApp",
        "Scammers shift to private chats where platforms can’t warn you.",
        re.compile(r"\b(telegram|whatsapp (?:group|hr|me)|join (?:our|the) (?:group|channel))\b", _F),
        10, "medium",
    ),
    Rule(
        "callback", "Pushes you to call or message a number",
        "Calling back puts you in a scripted conversation with the scammer.",
        re.compile(r"\b(call|whatsapp|contact|sms)\b[^.]{0,30}(\+?91[\s-]?)?[6-9]\d{9}\b", _F),
        6, "low",
    ),
]

LINK_RE = re.compile(
    r"\b((?:https?://|www\.)[^\s<>\"')]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|net|org|xyz|top|info|link|click|ly|co|me|shop|site|online|live|app|io|gl|cam|icu)(?:/[^\s<>\"')]*)?)",
    _F,
)

_OTP_DELIVERY_RE = re.compile(r"\b(otp|code|verification code)\b[^.]{0,30}\b(is|:)\s*\d{4,8}\b", _F)
_DO_NOT_SHARE_RE = re.compile(r"\b(do not|don['’]t|never) share\b", _F)

MESSAGE_RECS = {
    "credentials": "Never share your OTP, UPI PIN, CVV or passwords — banks never ask for them.",
    "impersonation": "Contact the organisation using the number on its official website or the back of your card.",
    "prize": "Ignore prize claims for contests you never entered.",
    "payment": "Don’t pay a “fee” to receive money, prizes, parcels or refunds.",
    "remote": "Don’t install screen-sharing apps at a stranger’s request.",
    "job": "Real employers don’t charge joining fees or pay you to like videos.",
    "investment": "Check SEBI registration before investing; guaranteed returns are a red flag.",
    "link": "Don’t open the link. If you need the service, type its address yourself.",
}

CATEGORY_NOUNS = {
    "Prize / lottery": "prize and lottery",
    "KYC / bank impersonation": "fake-KYC and bank-impersonation",
    "Job / task scam": "job and task",
    "Investment scam": "investment",
    "Impersonation": "impersonation",
    "Remote access": "remote-access",
    "Phishing link": "phishing",
}


def extract_links(body: str) -> list[str]:
    return dedupe(re.sub(r"[.,!?]+$", "", m.group(0)) for m in LINK_RE.finditer(body))


def analyze_message(text: str) -> dict:
    body = text.strip()
    if not body:
        raise ValueError("Paste or type a message to scan.")

    # Run ML Model Prediction
    ml_res = predict_message_scam(body)

    # A normal OTP delivery ("Your OTP is 123456. Do not share it") mentions an
    # OTP without asking for it, so it shouldn't count as a credential request.
    is_otp_delivery = bool(_OTP_DELIVERY_RE.search(body)) and bool(_DO_NOT_SHARE_RE.search(body))

    hits = [r for r in MESSAGE_RULES if r.pattern.search(body) and not (is_otp_delivery and r.id == "credentials")]
    indicators = [{"id": r.id, "label": r.label, "detail": r.detail, "severity": r.severity} for r in hits]
    score = 4 + sum(r.weight for r in hits)

    # Incorporate ML Model prediction into indicators & score
    if ml_res.get("is_spam"):
        conf = ml_res.get("confidence", 0.8)
        score += int(conf * 30)
        indicators.append({
            "id": "ml_spam_model",
            "label": "NLP ML Model: High Scam Probability",
            "detail": f"Trained Scikit-Learn NLP pipeline classified message as scam/spam with {int(conf * 100)}% confidence.",
            "severity": "high",
        })

    # Links inside the message are analysed with the URL detector.
    links = extract_links(body)
    link_result = None
    if links:
        score += 8
        try:
            link_result = analyze_url(links[0])
        except UrlValidationError:
            link_result = None
        if link_result and link_result["risk_score"] >= THRESHOLDS["suspicious"]:
            score += 26 if link_result["risk_level"] == "DANGEROUS" else 14
            indicators.append({
                "id": "link",
                "label": "Suspicious URL",
                "detail": f"{link_result['analyzed']['registered_domain']}: {link_result['reasons'][0]}",
                "severity": "high",
            })
        else:
            indicators.append({
                "id": "link",
                "label": "Contains a link",
                "detail": f"{links[0]} — no strong risk signals, but verify before opening.",
                "severity": "low",
            })

    # Combination bonuses for classic scripts.
    ids = {i["id"] for i in indicators}
    if "prize" in ids and ("urgency" in ids or "click" in ids):
        score += 10
    if "credentials" in ids and ("threat" in ids or "impersonation" in ids):
        score += 10
    if "job" in ids and ("offplatform" in ids or "callback" in ids or "payment" in ids):
        score += 12

    if not indicators:
        score = 3 + (stable_hash(body) % 9)
    # A single high-severity signal (e.g. a guaranteed-returns pitch or a
    # remote-access request) is always worth a second look on its own.
    if any(r.severity == "high" for r in hits) or any(i["severity"] == "high" for i in indicators):
        score = max(score, HIGH_SEVERITY_FLOOR)
    if is_otp_delivery and not indicators:
        indicators.append({
            "id": "otp-info",
            "label": "Looks like a standard OTP delivery",
            "detail": "It tells you not to share the code, which is what genuine services do. Only enter it if you requested it.",
            "severity": "info",
        })
    score = int(clamp(js_round(score + (stable_hash(body) % 3)), 1, 97))
    risk_level = level_from_score(score)

    category = (
        next((r.category for r in hits if r.category and r.severity == "high"), None)
        or next((r.category for r in hits if r.category), None)
        or ("Phishing link" if "link" in ids and (link_result or {}).get("risk_level") != "SAFE" else None)
        or ("No known pattern" if risk_level == "SAFE" else "Unclassified")
    )

    recommendations: list[str] = []
    if risk_level != "SAFE":
        if "link" in ids:
            recommendations.append(MESSAGE_RECS["link"])
        for rid in ("credentials", "prize", "payment", "remote", "job", "investment", "impersonation"):
            if rid in ids:
                recommendations.append(MESSAGE_RECS[rid])
        recommendations.append("Verify the sender independently before you reply.")
        recommendations.append("Report it at sancharsaathi.gov.in (Chakshu). If money was lost, call 1930 immediately.")
    else:
        recommendations.append("No action needed. If the sender later asks for money or codes, scan again.")
        recommendations.append("Still verify unknown senders before sharing personal details.")

    noun = CATEGORY_NOUNS.get(category, "common")
    if risk_level == "DANGEROUS":
        summary = f"This message contains {len(indicators)} indicators commonly associated with {noun} scams."
    elif risk_level == "SUSPICIOUS":
        summary = "Some patterns in this message are common in scams. Treat it with caution and verify the sender."
    else:
        summary = "No common scam patterns were found. That isn’t a guarantee — stay alert to requests for money or codes."

    return {
        "risk_level": risk_level,
        "risk_score": score,
        "reasons": [i["label"] for i in indicators if i["severity"] != "info"],
        "recommendations": dedupe(recommendations)[:5],
        "summary": summary,
        "indicators": indicators,
        "category": category,
        "links": links,
    }
