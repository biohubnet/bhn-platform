/**
 * PATCH /api/admin/launch-readiness/[key]
 *
 * Admin updates manual state for a single checklist item.
 * Body fields are optional; whatever's present in the body is updated.
 *
 *   {
 *     manualStatus?: "not_started" | "in_progress" | "done" | "blocked" | "not_applicable" | null,
 *     notes?: string | null,
 *     ownerId?: string | null,
 *     targetDate?: string (ISO) | null,
 *     decisionNeeded?: boolean,
 *   }
 *
 * Pass null to clear a value (revert to auto-detected, unassigned, etc.).
 *
 * The item key must match a canonical entry in CHECKLIST — we refuse
 * to write rows for unknown keys (would just be orphaned data).
 */
import { NextResponse } from "next/server";
import { requireRole, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CHECKLIST, type ResolvedStatus } from "@/lib/launch/checklist";

const VALID_STATUSES: ResolvedStatus[] = [
  "not_started", "in_progress", "done", "blocked", "not_applicable",
];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminId = (session.user as { id?: string }).id ?? null;

  const { key } = await ctx.params;

  // Refuse unknown keys — checklist is canonical.
  const canonical = CHECKLIST.find((c) => c.key === key);
  if (!canonical) {
    return NextResponse.json({ error: `Unknown checklist key: ${key}` }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Build the patch; only include fields that were sent.
  const patch: Record<string, unknown> = {};
  if ("manualStatus" in body) {
    const v = body.manualStatus;
    if (v === null) {
      patch.manualStatus = null;
    } else if (typeof v === "string" && VALID_STATUSES.includes(v as ResolvedStatus)) {
      patch.manualStatus = v;
    } else {
      return NextResponse.json(
        { error: `manualStatus must be one of: ${VALID_STATUSES.join(", ")}, or null.` },
        { status: 400 },
      );
    }
  }
  if ("notes" in body) {
    const v = body.notes;
    patch.notes = v === null ? null : (typeof v === "string" ? v.trim().slice(0, 2000) : null);
  }
  if ("ownerId" in body) {
    patch.ownerId = body.ownerId === null ? null : (typeof body.ownerId === "string" ? body.ownerId : null);
  }
  if ("targetDate" in body) {
    const v = body.targetDate;
    if (v === null) patch.targetDate = null;
    else if (typeof v === "string") {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid targetDate ISO." }, { status: 400 });
      }
      patch.targetDate = d;
    }
  }
  if ("decisionNeeded" in body) {
    patch.decisionNeeded = body.decisionNeeded === true;
  }
  patch.updatedById = adminId;

  await prisma.launchChecklistState.upsert({
    where: { itemKey: key },
    create: { itemKey: key, ...patch },
    update: patch,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  // Wipe all manual state — item reverts to pure auto detection
  // (or "not_started" default for manual items).
  await requireRole("admin").catch(() => null);
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key } = await ctx.params;
  await prisma.launchChecklistState.deleteMany({ where: { itemKey: key } });
  return NextResponse.json({ ok: true });
}
