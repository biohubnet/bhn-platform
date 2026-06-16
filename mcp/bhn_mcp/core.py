"""Pure logic for the BHN MCP server — auth / write-gating / formatting.

Deliberately imports nothing from fastmcp or psycopg at module load, so it is
unit-testable without those installed (see mcp/tests/test_core.py).
"""
from __future__ import annotations

import os


def writes_allowed() -> bool:
    """Read-only by default; writes only when explicitly enabled via env."""
    return os.environ.get("BHN_MCP_ALLOW_WRITES", "").strip().lower() in ("1", "true", "yes")


def check_token(token: str | None) -> bool:
    """A write token must be configured AND match (fail closed)."""
    expected = os.environ.get("BHN_MCP_TOKEN")
    return bool(expected) and token == expected


def authorize_write(token: str | None) -> tuple[bool, str]:
    """Gate a write tool: writes enabled + valid token, else a reason."""
    if not writes_allowed():
        return False, "Writes are disabled (set BHN_MCP_ALLOW_WRITES=1)."
    if not check_token(token):
        return False, "Invalid or missing token."
    return True, "ok"


def clamp_days(days: object) -> int:
    try:
        d = int(days)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        d = 30
    return max(1, min(d, 365))


def clamp_limit(limit: object, default: int = 20, hi: int = 100) -> int:
    try:
        n = int(limit)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        n = default
    return max(1, min(n, hi))


def format_metrics(total: int, errors: int, cost: float | None) -> dict:
    return {
        "total_calls": int(total),
        "error_rate": round(errors / total, 4) if total else 0.0,
        "total_cost_usd": round(float(cost or 0.0), 6),
    }


def valid_rating(rating: object) -> bool:
    return rating in (1, -1)
