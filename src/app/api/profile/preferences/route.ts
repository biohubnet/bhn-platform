/**
 * Per-user sidebar / feature preferences.
 *
 *   GET   /api/profile/preferences
 *     → { ok, prefs: { hidden, order } }
 *
 *   PATCH /api/profile/preferences
 *     body: { hidden?: string[]; order?: string[]; preset?: "minimal"|"default"|"full" }
 *     → { ok, prefs }
 *
 * Self-only. Each user's prefs only affect their own UI; nobody
 * else's sidebar / dashboard is touched. See
 * src/lib/preferences/registry.ts for what's toggleable and
 * src/lib/preferences/active.ts for the resolution semantics.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { parsePrefs, savePrefs, applyPreset, type PresetName } from "@/lib/preferences/active";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getMyUserId(): Promise<string | null> {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { featurePrefs: true },
  });
  const prefs = parsePrefs(user?.featurePrefs);
  return NextResponse.json({ ok: true, prefs });
}

export async function PATCH(req: NextRequest) {
  const userId = await getMyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    hidden?: unknown;
    order?: unknown;
    preset?: unknown;
  };

  // Preset wins — when set, replace prefs wholesale.
  if (typeof body.preset === "string") {
    if (body.preset !== "minimal" && body.preset !== "default" && body.preset !== "full") {
      return NextResponse.json({ error: "Unknown preset." }, { status: 400 });
    }
    const prefs = await applyPreset(userId, body.preset as PresetName);
    return NextResponse.json({ ok: true, prefs });
  }

  const patch: { hidden?: string[]; order?: string[] } = {};
  if (Array.isArray(body.hidden)) {
    patch.hidden = body.hidden.filter((s): s is string => typeof s === "string");
  }
  if (Array.isArray(body.order)) {
    patch.order = body.order.filter((s): s is string => typeof s === "string");
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  const prefs = await savePrefs(userId, patch);
  return NextResponse.json({ ok: true, prefs });
}
