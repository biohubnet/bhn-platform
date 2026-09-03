import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { setDesignTokenOverrides } from "@/lib/settings";

/**
 * Writes the admin-tuned design tokens.
 *
 * The body is intentionally loose here — a record of numbers — because
 * the authoritative validation is sanitizeOverrides in the token
 * registry, which is also what the reader trusts. Duplicating the
 * per-token ranges in a Zod schema would give two places to keep in step
 * and one of them would drift.
 */
const Body = z.object({
  overrides: z.record(z.string(), z.number()),
});

export async function POST(req: Request) {
  await requireRole("admin");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected { overrides: Record<string, number> }" }, { status: 400 });
  }

  // Returns what was actually kept: anything unknown or out of range is
  // dropped, and the form re-renders from this rather than from what it
  // sent, so a rejected value is visible instead of silently lost.
  const saved = await setDesignTokenOverrides(parsed.data.overrides);
  return NextResponse.json({ overrides: saved });
}
