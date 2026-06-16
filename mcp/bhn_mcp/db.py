"""Database access for the MCP tools — read-only queries plus the env-gated
write. psycopg is imported lazily so `core` stays importable without it."""
from __future__ import annotations

import os
import subprocess

from .core import clamp_days, clamp_limit, format_metrics


def _connect():
    import psycopg  # lazy import

    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg.connect(url)


def ai_metrics(days: object = 30) -> dict:
    d = clamp_days(days)
    sql = (
        'SELECT count(*), count(*) FILTER (WHERE NOT success), coalesce(sum("costUsd"), 0) '
        'FROM "AIInteraction" WHERE "createdAt" >= now() - make_interval(days => %s)'
    )
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(sql, (d,))
        total, errors, cost = cur.fetchone()
    out = format_metrics(total, errors, cost)
    out["window_days"] = d
    return out


def review_queue(limit: object = 20) -> list[dict]:
    n = clamp_limit(limit)
    sql = (
        'SELECT id, kind, "userRating", confidence, "reviewStatus", left(coalesce("answerExcerpt", \'\'), 300) '
        'FROM "AIInteraction" WHERE "flaggedForReview" = true ORDER BY "createdAt" DESC LIMIT %s'
    )
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(sql, (n,))
        rows = cur.fetchall()
    return [
        {"id": r[0], "kind": r[1], "user_rating": r[2], "confidence": r[3], "review_status": r[4], "answer_excerpt": r[5]}
        for r in rows
    ]


def search_contacts(query: str, limit: object = 20) -> list[dict]:
    n = clamp_limit(limit)
    like = f"%{(query or '').strip()}%"
    sql = (
        "SELECT id, values->>'name', values->>'org', values->>'email' "
        'FROM "OutreachPerson" '
        "WHERE values->>'name' ILIKE %s OR values->>'org' ILIKE %s OR values->>'email' ILIKE %s "
        "ORDER BY \"createdAt\" DESC LIMIT %s"
    )
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(sql, (like, like, like, n))
        rows = cur.fetchall()
    return [{"id": r[0], "name": r[1], "org": r[2], "email": r[3]} for r in rows]


def submit_feedback(interaction_id: str, rating: int) -> dict:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            'UPDATE "AIInteraction" SET "userRating" = %s, '
            '"flaggedForReview" = (CASE WHEN %s < 0 THEN true ELSE "flaggedForReview" END), '
            '"reviewStatus" = (CASE WHEN %s < 0 THEN coalesce("reviewStatus", \'open\') ELSE "reviewStatus" END) '
            "WHERE id = %s",
            (rating, rating, rating, interaction_id),
        )
        updated = cur.rowcount
        conn.commit()
    return {"ok": updated > 0, "updated": updated}


def trigger_eval() -> dict:
    """Run the offline eval suite in the repo root and return its summary."""
    repo = os.environ.get("BHN_REPO_DIR", os.path.join(os.path.dirname(__file__), "..", ".."))
    try:
        proc = subprocess.run(
            ["npm", "run", "eval:ci"], cwd=repo, capture_output=True, text=True, timeout=600
        )
        return {"ok": proc.returncode == 0, "exit_code": proc.returncode, "output": proc.stdout[-2000:]}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e)}
