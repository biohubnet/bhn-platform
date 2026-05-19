/**
 * Admin: write the active /login floater list.
 *
 *   POST /api/admin/login-floaters
 *     body: { floaters: FloaterInstance[] } | { reset: true }
 *
 * Validation lives in `setActiveLoginFloaters` (unknown registry
 * ids dropped, sizes clamped, MAX_FLOATERS enforced) so this
 * handler is a thin auth + I/O wrapper.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  setActiveLoginFloaters,
  resetLoginFloatersToDefaults,
} from "@/lib/login-floaters/config";
import type { FloaterInstance } from "@/lib/login-floaters/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    floaters?: unknown;
    reset?: boolean;
  };

  if (body.reset === true) {
    const written = await resetLoginFloatersToDefaults();
    return NextResponse.json({ ok: true, floaters: written });
  }

  if (!Array.isArray(body.floaters)) {
    return NextResponse.json(
      { error: "Body must include a `floaters` array." },
      { status: 400 },
    );
  }

  const written = await setActiveLoginFloaters(body.floaters as FloaterInstance[]);
  return NextResponse.json({ ok: true, floaters: written });
}
