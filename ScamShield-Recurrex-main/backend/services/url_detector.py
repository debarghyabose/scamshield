"""
URL risk detector.

Inspects the *text* of a link — it never fetches or opens the URL.
Signals: raw IPs, "@" tricks, punycode, shorteners, risky TLDs, deep
subdomains, brand look-alikes, a sample blocklist and pressure keywords.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import SplitResult, urlsplit

from .risk_engine import clamp, js_round, level_from_score, stable_hash

# Reference list of official domains. Not exhaustive — extend as needed.
OFFICIAL_DOMAINS: dict[str, list[str]] = {
    "sbi": ["sbi.co.in", "onlinesbi.sbi"],
    "hdfc": ["hdfcbank.com"],
    "icici": ["icicibank.com"],
    "axis": ["axisbank.com"],
    "kotak": ["kotak.com"],
    "paytm": ["paytm.com"],
    "phonepe": ["phonepe.com"],
    "amazon": ["amazon.in", "amazon.com"],
    "flipkart": ["flipkart.com"],
    "google": ["google.com"],
    "npci": ["npci.org.in"],
    "incometax": ["incometax.gov.in"],
    "rbi": ["rbi.org.in"],
    "irctc": ["irctc.co.in"],
    "indiapost": ["indiapost.gov.in"],
}
ALL_OFFICIAL = {d for domains in OFFICIAL_DOMAINS.values() for d in domains}

# Small sample blocklist. A production deployment should query a live
# threat-intelligence feed (e.g. Google Safe Browsing) here instead.
SAMPLE_BLOCKLIST = {
    "sbi-kyc-update.xyz",
    "sbi-rewards-claim.xyz",
    "free-rewards-claim.top",
    "paytm-cashback-offer.site",
    "amaz0n-offers.shop",
    "hdfc-netbanking-verify.com",
    "incometax-refund-status.online",
    "indiapost-redelivery.info",
}

SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy",
    "shorturl.at", "ow.ly", "tiny.cc", "rebrand.ly",
}

RISKY_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "click", "link", "rest", "zip",
    "mov", "icu", "buzz", "shop", "site", "online", "live", "info", "cam",
}

MULTI_PART_SUFFIXES = {"co.in", "gov.in", "org.in", "net.in", "ac.in", "co.uk", "com.au", "res.in", "nic.in"}

URL_KEYWORDS = [
    "login", "signin", "verify", "verification", "secure", "update", "kyc", "reward", "claim", "free", "bonus", "gift",
    "wallet", "unlock", "refund", "blocked", "suspend", "otp", "lottery", "prize", "cashback", "account",
]

_SCHEME_RE = re.compile(r"^[a-z][a-z0-9+.-]*://", re.I)
_HTTP_RE = re.compile(r"^https?://", re.I)
_IPV4_RE = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
_HOST_RE = re.compile(r"^[a-z0-9-]+(\.[a-z0-9-]+)+$")


class UrlValidationError(ValueError):
    """Raised when the input can't be parsed as an http(s) URL."""


@dataclass
class ParsedUrl:
    parts: SplitResult
    host: str
    has_scheme: bool
    is_ip: bool

    @property
    def scheme(self) -> str:
        return self.parts.scheme.lower()

    @property
    def path(self) -> str:
        return self.parts.path or "/"

    @property
    def search(self) -> str:
        return f"?{self.parts.query}" if self.parts.query else ""


def registered_domain(host: str) -> str:
    labels = [label for label in host.split(".") if label]
    if len(labels) <= 2:
        return ".".join(labels)
    last_two = ".".join(labels[-2:])
    return ".".join(labels[-3:]) if last_two in MULTI_PART_SUFFIXES else last_two


def _normalise_lookalike(s: str) -> str:
    s = s.lower()
    for a, b in (("rn", "m"), ("vv", "w"), ("0", "o"), ("1", "l"), ("3", "e"), ("4", "a"), ("5", "s"), ("7", "t")):
        s = s.replace(a, b)
    return s


def _levenshtein(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (0 if a[i - 1] == b[j - 1] else 1))
        prev = cur
    return prev[len(b)]


def parse_url(raw_input: str) -> ParsedUrl:
    """Parses user input into URL parts without ever fetching it."""
    raw = raw_input.strip()
    if not raw:
        raise UrlValidationError("Enter a URL to check.")
    if re.search(r"\s", raw):
        raise UrlValidationError("URLs can’t contain spaces.")
    has_scheme = bool(_SCHEME_RE.match(raw))
    if has_scheme and not _HTTP_RE.match(raw):
        raise UrlValidationError("Only http:// and https:// links can be checked.")
    try:
        parts = urlsplit(raw if has_scheme else f"http://{raw}")
        _ = parts.port  # raises ValueError for malformed ports
        host = (parts.hostname or "").lower()
        if host and not host.isascii():
            host = host.encode("idna").decode("ascii")
    except (ValueError, UnicodeError) as exc:
        raise UrlValidationError("That doesn’t look like a valid URL.") from exc
    if not host:
        raise UrlValidationError("That doesn’t look like a valid URL.")
    is_ip = bool(_IPV4_RE.match(host))
    if not is_ip and not _HOST_RE.match(host) and not host.startswith("xn--") and ".xn--" not in host:
        raise UrlValidationError("That doesn’t look like a valid domain (e.g. example.com).")
    return ParsedUrl(parts=parts, host=host, has_scheme=has_scheme, is_ip=is_ip)


def analyze_url(raw_input: str) -> dict:
    parsed = parse_url(raw_input)
    host, is_ip, has_scheme = parsed.host, parsed.is_ip, parsed.has_scheme
    raw_lower = raw_input.lower()
    reg_domain = host if is_ip else registered_domain(host)
    tld = host.split(".")[-1]
    is_official = reg_domain in ALL_OFFICIAL
    is_https = parsed.scheme == "https"

    score = 6
    indicators: list[dict] = []
    checks: list[dict] = []

    # 1. Suspicious domain patterns
    pattern_hits: list[str] = []
    pattern_severity = "pass"
    if is_ip:
        pattern_hits.append("Uses a raw IP address instead of a domain name")
        score += 25
        pattern_severity = "fail"
    if parsed.parts.username or "@" in raw_lower:
        pattern_hits.append("Contains “@”, which can hide the real destination")
        score += 20
        pattern_severity = "fail"
    if "xn--" in host:
        pattern_hits.append("Uses punycode characters that can imitate other letters")
        score += 18
        pattern_severity = "fail"
    if reg_domain in SHORTENERS:
        pattern_hits.append("Link shortener hides the final destination")
        score += 15
        if pattern_severity == "pass":
            pattern_severity = "warn"
    if not is_ip and tld in RISKY_TLDS:
        pattern_hits.append(f"“.{tld}” domains are cheap to register and common in scam campaigns")
        score += 14
        if pattern_severity == "pass":
            pattern_severity = "warn"
    subdomain_depth = 0 if is_ip else len(host.split(".")) - len(reg_domain.split("."))
    if subdomain_depth >= 3:
        pattern_hits.append(f"{subdomain_depth} levels of subdomains")
        score += 10
        if pattern_severity == "pass":
            pattern_severity = "warn"
    if reg_domain.count("-") >= 2 or len(reg_domain) > 28:
        pattern_hits.append("Long or heavily hyphenated domain name")
        score += 8
        if pattern_severity == "pass":
            pattern_severity = "warn"
    checks.append({
        "id": "pattern",
        "label": "Suspicious domain patterns",
        "status": pattern_severity,
        "detail": "; ".join(pattern_hits) + "." if pattern_hits else "No unusual structure in the domain name.",
    })
    for hit in pattern_hits:
        indicators.append({"label": hit, "severity": "high" if pattern_severity == "fail" else "medium"})

    # 2. HTTPS
    if is_https:
        checks.append({
            "id": "https",
            "label": "HTTPS status",
            "status": "pass",
            "detail": "Uses HTTPS. This encrypts the connection but does not prove the site is legitimate — many scam sites use HTTPS too.",
        })
    else:
        score += 12 if has_scheme else 6
        checks.append({
            "id": "https",
            "label": "HTTPS status",
            "status": "warn",
            "detail": (
                "Uses unencrypted HTTP. Never enter passwords or card details on an HTTP page."
                if has_scheme
                else "No scheme given, so HTTPS couldn’t be confirmed. Be careful if the page asks for any details."
            ),
        })
        indicators.append({"label": "Connection is not HTTPS", "severity": "low"})

    # 3. Domain mismatch / look-alike
    mismatch = None
    if not is_ip and not is_official:
        norm = _normalise_lookalike(host)
        tokens = re.split(r"[.-]", norm)
        first_label = _normalise_lookalike(reg_domain.split(".")[0])
        for brand, domains in OFFICIAL_DOMAINS.items():
            if len(brand) <= 4:
                mentions = any(t == brand or t.startswith(brand) or t.endswith(brand) for t in tokens)
            else:
                mentions = brand in norm.replace("-", "")
            official_label = domains[0].split(".")[0]
            dist = _levenshtein(first_label, official_label)
            lookalike = len(official_label) >= 5 and 0 < dist <= 2
            if mentions or lookalike:
                mismatch = {"brand": brand, "official": domains[0], "lookalike": lookalike and not mentions}
                break
    if is_official:
        checks.append({
            "id": "mismatch",
            "label": "Domain mismatch",
            "status": "pass",
            "detail": f"{reg_domain} is on ScamShield’s reference list of official domains.",
        })
    elif mismatch:
        score += 30
        detail = (
            f"The domain looks similar to {mismatch['official']} but isn’t it."
            if mismatch["lookalike"]
            else f"Mentions “{mismatch['brand']}” but the registered domain is {reg_domain}, not {mismatch['official']}."
        )
        checks.append({"id": "mismatch", "label": "Domain mismatch", "status": "fail", "detail": detail})
        indicators.append({"label": "Brand name used on an unofficial domain", "detail": detail, "severity": "high"})
    else:
        checks.append({
            "id": "mismatch",
            "label": "Domain mismatch",
            "status": "pass",
            "detail": "Doesn’t imitate any brand on the reference list.",
        })

    # 4. Blocklist
    if reg_domain in SAMPLE_BLOCKLIST:
        score += 45
        checks.append({
            "id": "blocklist",
            "label": "Known blocklist match",
            "status": "fail",
            "detail": f"{reg_domain} appears in ScamShield’s sample blocklist ({len(SAMPLE_BLOCKLIST)} entries).",
        })
        indicators.append({"label": "Matches a known scam domain (sample list)", "severity": "high"})
    else:
        checks.append({
            "id": "blocklist",
            "label": "Known blocklist match",
            "status": "info",
            "detail": "No match in ScamShield’s sample blocklist. This is a small list, not a live threat feed.",
        })

    # 5. Pressure keywords
    haystack = (host + parsed.path + parsed.search).lower()
    kw_hits = [k for k in URL_KEYWORDS if k in haystack]
    if kw_hits and not is_official:
        score += min(18, 8 + len(kw_hits) * 3)
        quoted = ", ".join(f"“{k}”" for k in kw_hits)
        checks.append({
            "id": "keywords",
            "label": "Suspicious keywords",
            "status": "warn",
            "detail": f"Contains {quoted} — words often used to rush people into logging in or claiming rewards.",
        })
        indicators.append({"label": f"Pressure keywords in link: {', '.join(kw_hits[:3])}", "severity": "medium"})
    else:
        checks.append({
            "id": "keywords",
            "label": "Suspicious keywords",
            "status": "pass",
            "detail": "Keywords found, but on an official domain." if kw_hits else "No high-pressure keywords found.",
        })

    if is_official:
        score = min(score, 8 if is_https else 22)
    score = int(clamp(js_round(score + (stable_hash(host) % 4)), 2, 98))
    risk_level = level_from_score(score)

    reasons = [i["label"] for i in indicators] if indicators else ["No common risk signals found in the link structure"]

    recommendations: list[str] = []
    if risk_level != "SAFE":
        recommendations.append("Don’t open this link or enter any details on the page.")
        if mismatch:
            recommendations.append(f"Type {mismatch['official']} into your browser yourself instead of following the link.")
        recommendations.append("If you already entered details, change your password and contact your bank.")
    else:
        recommendations.append("Check the address bar again before entering any login or payment details.")
        recommendations.append("A clean result isn’t a guarantee — trust your judgement if the page feels off.")

    if risk_level == "DANGEROUS":
        summary = f"This link shows {len(indicators)} signals commonly seen in phishing links."
    elif risk_level == "SUSPICIOUS":
        summary = "Some features of this link are common in phishing. Treat it with caution."
    elif is_official:
        summary = "This matches an official domain on our reference list."
    else:
        summary = "No common phishing patterns were found in this link."

    return {
        "risk_level": risk_level,
        "risk_score": score,
        "reasons": reasons,
        "recommendations": recommendations,
        "summary": summary,
        "indicators": indicators,
        "checks": checks,
        "category": "No known pattern" if risk_level == "SAFE" else "Phishing link",
        "analyzed": {"host": host, "registered_domain": reg_domain},
    }
