/**
 * GET  /api/assist/preferences  — read the calling user's prefs
 * PATCH /api/assist/preferences — update them
 *
 * Body for PATCH (any subset):
 *   {
 *     consented?: boolean,
 *     hintsDisabled?: boolean,
 *     resetThreshold?: true    // restore the platform default 0.75
 *   }
 *
 * Setting `consented: false` does NOT delete events — the user
 * keeps their history visible at /profile/assist-history and can
 * delete it from there. We only stop collecting NEW events while
 * the flag is off.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAssistPrefs, updateAssistPrefs } from "@/lib/assist/preferences";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await getAssistPrefs(userId);
  return NextResponse.json({
    consented: prefs.consented,
    hintsDisabled: prefs.hintsDisabled,
    confidenceThreshold: prefs.confidenceThreshold,
    suppressUntil: prefs.suppressUntil?.toISOString() ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    consented?: unknown;
    hintsDisabled?: unknown;
    resetThreshold?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  const patch: Parameters<typeof updateAssistPrefs>[1] = {};
  if (typeof body.consented === "boolean") patch.consented = body.consented;
  if (typeof body.hintsDisabled === "boolean") patch.hintsDisabled = body.hintsDisabled;
  if (body.resetThreshold === true) patch.confidenceThreshold = 0.75;

  const next = await updateAssistPrefs(userId, patch);
  return NextResponse.json({
    ok: true,
    consented: next.consented,
    hintsDisabled: next.hintsDisabled,
    confidenceThreshold: next.confidenceThreshold,
    suppressUntil: next.suppressUntil?.toISOString() ?? null,
  });
}
