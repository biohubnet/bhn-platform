/**
 * DELETE /api/admin/showcase/[id]
 *
 * Admin permanently removes a graduate showcase submission. Drops the
 * R2 headshot object best-effort, then the DB row. No soft-delete —
 * the public form is unauthenticated and spam should disappear cleanly
 * (otherwise it accumulates in /admin/showcase forever).
 *
 * The R2 cleanup runs first so we don't leak orphaned blobs if the DB
 * delete throws. If R2 cleanup fails (network blip, key already gone)
 * we swallow and continue — `deleteR2ObjectByUrl` is best-effort by
 * design and a stuck R2 object isn't a reason to keep a row of spam.
 *
 * Guard rails:
 *   • Admin role required (requireRole).
 *   • Returns 404 (not 403) when the row doesn't exist — admins are
 *     trusted enough that leaking existence here doesn't matter, and
 *     the clearer message helps debug stale UI state.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteR2ObjectByUrl } from "@/lib/r2";

export const runtime = "nodejs";

const PILL_KINDS = ["workshop", "pathway", "cohort"] as const;
type PillKind = (typeof PILL_KINDS)[number];
type Pill = { kind: PillKind; label: string };

/** Coerce arbitrary client input into a clean, capped list of pills. */
function sanitisePills(input: unknown): Pill[] {
  if (!Array.isArray(input)) return [];
  const out: Pill[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const kind = (raw as { kind?: unknown }).kind;
    const label = (raw as { label?: unknown }).label;
    if (!PILL_KINDS.includes(kind as PillKind)) continue;
    const text = typeof label === "string" ? label.trim().slice(0, 80) : "";
    if (!text) continue;
    out.push({ kind: kind as PillKind, label: text });
    if (out.length >= 24) break; // hard cap — a card can't carry more
  }
  return out;
}

/**
 * PATCH /api/admin/showcase/[id]  { pills: Pill[] }
 *
 * Admin edits the membership pills (workshop / pathway / cohort tags)
 * shown on a submission card. Replaces the whole array — the client
 * always sends the full desired set after an add / edit / remove.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { pills?: unknown };
  const pills = sanitisePills(body.pills);

  const existing = await prisma.showcaseSubmission.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  await prisma.showcaseSubmission.update({ where: { id }, data: { pills } });
  return NextResponse.json({ ok: true, pills });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.showcaseSubmission.findUnique({
    where: { id },
    select: { id: true, photoKey: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  // R2 cleanup first, best-effort.
  try {
    await deleteR2ObjectByUrl(existing.photoKey);
  } catch (err) {
    console.warn("[admin/showcase] R2 delete failed (continuing):", err);
  }

  await prisma.showcaseSubmission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
