/**
 * GET /api/login-floaters — public-readable list of the active
 * floaters for the /login backdrop. Called from the client login
 * page on mount; the component map lives in
 * src/lib/login-floaters/registry.ts and is referenced by stable
 * string ids so the API payload stays serialisable.
 *
 * Open to unauthenticated callers (the /login page itself is
 * pre-auth, so its dependency has to be too).
 */
import { NextResponse } from "next/server";
import { getActiveLoginFloaters, getLoginFloaterFx } from "@/lib/login-floaters/config";

export const runtime = "nodejs";
// Floaters change on admin edits, not on every request — but
// /login is hit a lot, so don't aggressively cache; rely on the
// DB read being cheap (single-row indexed lookup).
export const dynamic = "force-dynamic";

export async function GET() {
  const [floaters, fx] = await Promise.all([
    getActiveLoginFloaters(),
    getLoginFloaterFx(),
  ]);
  // Spreads `floatersEnabled` + `sparklesEnabled` alongside the list so
  // the login page can gate each layer without a second request.
  return NextResponse.json({ floaters, ...fx });
}
