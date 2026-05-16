/**
 * POST /api/equip/applications/[id]/submit
 *
 * Transitions an EquipApplication from "draft" to "submitted".
 * Enforces the budget cap for the stream + the minimum required
 * fields. Stamps submittedAt so reviewers can sort by it.
 *
 * Idempotent: re-POSTing on an already-submitted app returns 200
 * with `{ ok: true, alreadySubmitted: true }` so refresh tolerance
 * is built in.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  STREAM_BUDGETS,
  type EquipStream,
  type VentureConnectFormData,
} from "@/lib/equip/types";

export const runtime = "nodejs";

/** Minimum fields required to submit a VentureConnect application.
 *  Each must be a non-empty string or > 0 number. Phase A only —
 *  VentureLift gets its own validator in Phase B. */
function validateVentureConnect(formData: VentureConnectFormData): string[] {
  const errors: string[] = [];
  if (!formData.eventName?.trim()) errors.push("Event name is required");
  if (!formData.eventDate?.trim()) errors.push("Event date is required");
  if (!formData.alignmentNarrative || formData.alignmentNarrative.trim().length < 20) {
    errors.push("Alignment narrative needs at least 20 characters");
  }
  const total =
    (formData.budgetRegistration ?? 0) +
    (formData.budgetTravel ?? 0) +
    (formData.budgetLodging ?? 0) +
    (formData.budgetOther ?? 0);
  if (total <= 0) errors.push("At least one budget line must be set");
  if (total > STREAM_BUDGETS.venture_connect) {
    errors.push(`Total budget exceeds $${STREAM_BUDGETS.venture_connect.toLocaleString()} cap`);
  }
  return errors;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const app = await prisma.equipApplication.findUnique({
    where: { id },
    select: {
      id: true, userId: true, stream: true, status: true,
      formData: true, applicantType: true, institution: true,
    },
  });
  if (!app || app.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (app.status !== "draft") {
    // Already moved past draft — return idempotent OK so the
    // applicant doesn't get a confusing error if they hit submit
    // twice (e.g. double-click race).
    return NextResponse.json({ ok: true, alreadySubmitted: true });
  }

  // Eligibility block must be filled in (the wizard fills it
  // earlier, but a determined user could bypass).
  if (!app.applicantType || !app.institution) {
    return NextResponse.json(
      { error: "Eligibility block incomplete — re-run the wizard" },
      { status: 400 },
    );
  }

  // Stream-specific validation.
  const formData = (app.formData ?? {}) as Record<string, unknown>;
  let errors: string[] = [];
  let total = 0;
  if (app.stream === "venture_connect") {
    errors = validateVentureConnect(formData as VentureConnectFormData);
    const f = formData as VentureConnectFormData;
    total = (f.budgetRegistration ?? 0) + (f.budgetTravel ?? 0) + (f.budgetLodging ?? 0) + (f.budgetOther ?? 0);
  } else if (app.stream === "venture_lift") {
    // Phase A keeps the schema; the full VentureLift validator is
    // wired in Phase B. Until then, anything VL is rejected at
    // submit so we don't accept malformed drafts.
    return NextResponse.json(
      { error: "VentureLift submissions ship in Phase B — your draft is saved" },
      { status: 503 },
    );
  } else {
    return NextResponse.json({ error: "Unknown stream" }, { status: 400 });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const cap = STREAM_BUDGETS[app.stream as EquipStream];
  const requestedAmount = Math.min(total, cap);

  const updated = await prisma.equipApplication.update({
    where: { id },
    data: {
      status: "submitted",
      submittedAt: new Date(),
      requestedAmount,
    },
    select: { id: true, status: true, submittedAt: true, requestedAmount: true },
  });
  return NextResponse.json({ ok: true, application: updated });
}
