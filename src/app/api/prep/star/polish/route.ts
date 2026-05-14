/**
 * AI polish for an in-progress STAR story.
 *
 *   POST /api/prep/star/polish
 *     body: { situation, task, action, result, intent? }
 *
 * Returns a suggested revision OR null when AI isn't configured /
 * fails. The client UI lets the trainee accept or reject — we never
 * mutate their draft server-side.
 *
 * Bounded by `chat()`'s own rate limits + interaction-log entries
 * tagged feature="prep.star-polish", visible at /admin/analytics.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { polishStarStory } from "@/lib/prep/star";

export const runtime = "nodejs";

const MAX_FIELD = 2000;
const MAX_INTENT = 240;

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
    intent?: string;
  };

  const fields = {
    situation: String(body.situation ?? "").trim().slice(0, MAX_FIELD),
    task: String(body.task ?? "").trim().slice(0, MAX_FIELD),
    action: String(body.action ?? "").trim().slice(0, MAX_FIELD),
    result: String(body.result ?? "").trim().slice(0, MAX_FIELD),
  };
  if (!fields.situation || !fields.task || !fields.action || !fields.result) {
    return NextResponse.json(
      { error: "All four STAR fields are required before polishing." },
      { status: 400 },
    );
  }

  const intent = typeof body.intent === "string"
    ? body.intent.trim().slice(0, MAX_INTENT)
    : undefined;

  const revision = await polishStarStory(fields, intent, userId);
  if (!revision) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI polish isn't available right now — either it's not configured on this deployment or the model returned an unparseable response. Your draft hasn't been changed.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, revision });
}
