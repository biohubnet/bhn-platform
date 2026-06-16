"""BHN MCP server (FastMCP).

Exposes the platform's AI surface to MCP clients: reliability/cost metrics, the
human-review queue, an eval trigger, and contact search. Read-only by default;
the two write tools are env-gated (BHN_MCP_ALLOW_WRITES) and token-checked
(BHN_MCP_TOKEN). Run: `python -m bhn_mcp.server`.
"""
from __future__ import annotations

from fastmcp import FastMCP

from . import db
from .core import authorize_write, valid_rating

mcp = FastMCP("bhn-mcp")


@mcp.tool()
def ai_metrics(days: int = 30) -> dict:
    """AI reliability + cost over the AIInteraction log (read-only). days: 1-365."""
    return db.ai_metrics(days)


@mcp.tool()
def review_queue(limit: int = 20) -> list:
    """Flagged AI answers awaiting human review (read-only)."""
    return db.review_queue(limit)


@mcp.tool()
def search_contacts(query: str, limit: int = 20) -> list:
    """Search the outreach contact directory by name / org / email (read-only)."""
    return db.search_contacts(query, limit)


@mcp.tool()
def submit_feedback(interaction_id: str, rating: int, token: str = "") -> dict:
    """Record thumbs feedback on an AI answer (WRITE — env-gated + token). rating: 1 or -1."""
    ok, msg = authorize_write(token)
    if not ok:
        return {"ok": False, "error": msg}
    if not valid_rating(rating):
        return {"ok": False, "error": "rating must be 1 or -1"}
    return db.submit_feedback(interaction_id, rating)


@mcp.tool()
def trigger_eval(token: str = "") -> dict:
    """Run the offline eval suite (WRITE/action — env-gated + token)."""
    ok, msg = authorize_write(token)
    if not ok:
        return {"ok": False, "error": msg}
    return db.trigger_eval()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
