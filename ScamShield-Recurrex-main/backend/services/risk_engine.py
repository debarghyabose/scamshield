"""
Shared scoring helpers for the ScamShield detectors.

The detectors are transparent, rule-based heuristics — not a trained model.
Every rule adds a weight to a 0–100 risk index and records a human-readable
reason, so a result can always explain *why* something was flagged.

The score is an index, not a probability or a confidence percentage.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Iterable

ENGINE_VERSION = "scamshield-rules-1.0"

THRESHOLDS = {"suspicious": 30, "dangerous": 70}


def level_from_score(score: int) -> str:
    if score >= THRESHOLDS["dangerous"]:
        return "DANGEROUS"
    if score >= THRESHOLDS["suspicious"]:
        return "SUSPICIOUS"
    return "SAFE"


def clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def js_round(x: float) -> int:
    """Math.round semantics (half rounds up), unlike Python's banker's rounding."""
    return int(math.floor(x + 0.5))


def to_fixed_1(x: float) -> str:
    """Number.prototype.toFixed(1) semantics (round half up on the exact value)."""
    return str(Decimal(x).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def _to_int32(n: int) -> int:
    n &= 0xFFFFFFFF
    return n - 0x100000000 if n & 0x80000000 else n


def stable_hash(s: str) -> int:
    """FNV-1a over UTF-16 code units. Gives identical inputs identical small jitter."""
    h = 2166136261
    data = s.encode("utf-16-le", errors="surrogatepass")
    for i in range(0, len(data), 2):
        code = data[i] | (data[i + 1] << 8)
        h = _to_int32(h) ^ code
        h = _to_int32(h * 16777619)
    return abs(h)


def dedupe(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


def format_inr(n: float) -> str:
    """₹ with Indian digit grouping, e.g. 2500000 -> ₹25,00,000."""
    value = js_round(n)
    sign = "-" if value < 0 else ""
    s = str(abs(value))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups + [tail])
    return f"₹{sign}{s}"


def envelope(scan_type: str, result: dict[str, Any]) -> dict[str, Any]:
    """Adds the metadata every scan response carries."""
    return {
        **result,
        "scan_type": scan_type,
        "is_demo": False,
        "engine": ENGINE_VERSION,
        "thresholds": dict(THRESHOLDS),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }
