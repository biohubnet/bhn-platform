/**
 * POST /api/equip/applications/[id]/submit
 *
 * Transitions an EquipApplication from "draft" to "submitted".
 * Validation rules match the BHN PDF requirements:
 *
 *   VentureConnect (EQUIP VentureConnect Grant Application Form,
 *   Mar 2026 PDF) — applicant info, company info, IP status,
 *   funding justification, $5,000 CAD budget cap, signature
 *   acknowledgement.
 *
 *   VentureLift pre-screening (v3 PDF) — applicant + PI info,
 *   IP status, 100-word Company Overview, 100-word Project
 *   Summary, all seven eligibility-checklist attestations.
 *
 * Idempotent: re-POSTing on an already-submitted app returns 200
 * with `{ ok: true, alreadySubmitted: true }`.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  STREAM_BUDGETS,
  wordCount,
  type EquipStream,
  type VentureConnectFormData,
  type VentureLiftFormData,
} from "@/lib/equip/types";
import { nextOpenDeadline } from "@/lib/equip/deadlines";

export const runtime = "nodejs";

const VC_BUDGET_KEYS: (keyof VentureConnectFormData)[] = [
  "budgetAirfare",
  "budgetTrainFare",
  "budgetRideshareTaxi",
  "budgetAccommodation",
  "budgetRegistration",
];

function sumVcBudget(f: VentureConnectFormData): number {
  return VC_BUDGET_KEYS.reduce<number>((s, k) => s + ((f[k] as number | undefined) ?? 0), 0);
}

/** Required fields + budget cap for VentureConnect. */
function validateVentureConnect(f: VentureConnectFormData): string[] {
  const errors: string[] = [];

  // Applicant
  if (!f.fullName?.trim())              errors.push("Applicant: Full Name is required");
  if (!f.institutionAffiliation?.trim()) errors.push("Applicant: Institution / Affiliation is required");
  if (!f.departmentProgram?.trim())     errors.push("Applicant: Department / Program is required");
  if (!f.currentRole)                   errors.push("Applicant: Current Role is required");
  if (!f.institutionEmail?.trim())      errors.push("Applicant: Institution Email is required");

  // Company
  if (!f.companyName?.trim())           errors.push("Company: Company Name is required");
  if (!f.ventureDescription || f.ventureDescription.trim().length < 30) {
    errors.push("Company: Venture description needs at least 30 characters");
  }

  // Funding justification
  if (!f.fundingJustification || f.fundingJustification.trim().length < 30) {
    errors.push("Funding Request Justification needs at least 30 characters");
  }

  // Budget
  const total = sumVcBudget(f);
  if (total <= 0) errors.push("At least one budget line item must be set");
  if (total > STREAM_BUDGETS.venture_connect) {
    errors.push(`Total budget exceeds the $${STREAM_BUDGETS.venture_connect.toLocaleString()} CAD cap`);
  }

  // Signature attestation
  if (f.acknowledged !== true) errors.push("Signature: please tick the acknowledgement checkbox");
  if (!f.signaturePrintedName?.trim()) errors.push("Signature: Print Name is required");
  if (!f.signatureDate?.trim())        errors.push("Signature: Date is required");

  return errors;
}

/** Required fields + 100-word limits + full eligibility checklist
 *  for VentureLift pre-screening. */
function validateVentureLift(f: VentureLiftFormData): string[] {
  const errors: string[] = [];

  if (!f.companyName?.trim())   errors.push("Company: Company Name is required");

  // Applicant
  if (!f.fullName?.trim())                errors.push("Applicant: Full Name is required");
  if (!f.institutionAffiliation?.trim())  errors.push("Applicant: Institution / Affiliation is required");
  if (!f.departmentProgram?.trim())       errors.push("Applicant: Department / Program is required");
  if (!f.currentRole)                     errors.push("Applicant: Current Role is required");
  if (!f.institutionalEmail?.trim())      errors.push("Applicant: Institutional Email is required");
  if (!f.applicantTitleInCompany?.trim()) errors.push("Applicant: Title / Position in the Company is required");
  if (!f.applicantTimeCommitment?.trim()) errors.push("Applicant: Estimated time commitment is required");

  // PI
  if (!f.piFullName?.trim())                errors.push("PI: Full Name is required");
  if (!f.piInstitutionAffiliation?.trim())  errors.push("PI: Institution / Affiliation is required");
  if (!f.piDepartmentProgram?.trim())       errors.push("PI: Department / Program is required");
  if (!f.piInstitutionalEmail?.trim())      errors.push("PI: Institutional Email is required");

  // Word-limited fields
  if (!f.companyOverview?.trim()) errors.push("Company Overview is required");
  if (wordCount(f.companyOverview) > 100) errors.push("Company Overview exceeds the 100-word limit");

  if (!f.projectSummary?.trim()) errors.push("Project Summary is required");
  if (wordCount(f.projectSummary) > 100) errors.push("Project Summary exceeds the 100-word limit");

  // Eligibility checklist — all seven must be checked
  if (!f.eligibilityStemProfessional)             errors.push("Eligibility: STEM professional + leadership role attestation required");
  if (!f.eligibilityCanadianIp)                   errors.push("Eligibility: Canadian IP attestation required");
  if (!f.eligibilityHealthOutcomesBiomanufacturing) errors.push("Eligibility: Human health + biomanufacturing attestation required");
  if (!f.eligibilityAcceleratorParticipated)      errors.push("Eligibility: Accelerator participation attestation required");
  if (f.eligibilityAcceleratorParticipated && !f.acceleratorPrograms?.trim()) {
    errors.push("Eligibility: List the accelerator / incubator programs");
  }
  if (!f.eligibilityPreseedStageReady)            errors.push("Eligibility: Pre-seed / seed stage readiness attestation required");
  if (!f.eligibilityNoDuplicateFunding)           errors.push("Eligibility: No-duplicate-funding attestation required");
  if (!f.eligibilityPiHoldsFunds)                 errors.push("Eligibility: PI agrees to hold funds attestation required");

  // Signature
  if (!f.signaturePrintedName?.trim()) errors.push("Signature: Printed Name is required");
  if (!f.signatureDate?.trim())        errors.push("Signature: Date is required");

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
    return NextResponse.json({ ok: true, alreadySubmitted: true });
  }

  if (!app.applicantType || !app.institution) {
    return NextResponse.json(
      { error: "Eligibility block incomplete — re-run the wizard" },
      { status: 400 },
    );
  }

  const formData = (app.formData ?? {}) as Record<string, unknown>;
  let errors: string[] = [];
  let total = 0;
  if (app.stream === "venture_connect") {
    errors = validateVentureConnect(formData as VentureConnectFormData);
    total = sumVcBudget(formData as VentureConnectFormData);
  } else if (app.stream === "venture_lift") {
    errors = validateVentureLift(formData as VentureLiftFormData);
    // VL pre-screening doesn't carry a per-line budget; the
    // $25K request is described in prose. Set requestedAmount
    // to the stream cap as the implied ask the BHN team will
    // discuss during the pre-screening consultation.
    total = STREAM_BUDGETS.venture_lift;
  } else {
    return NextResponse.json({ error: "Unknown stream" }, { status: 400 });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  // Deadline gating. Block the submit if there's no open window
  // for this stream. The /equip landing page already nudges the
  // applicant about open / closed status; this is the server-side
  // safety net so a stale tab can't slip past a closed window.
  const upcoming = await nextOpenDeadline(app.stream as EquipStream);
  if (!upcoming) {
    return NextResponse.json(
      { error: "There's no open funding window for this stream right now. Watch /equip for the next deadline." },
      { status: 400 },
    );
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
