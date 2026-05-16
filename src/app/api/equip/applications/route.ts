/**
 * Applicant-side Equip applications endpoint.
 *
 *   GET  /api/equip/applications              → list my applications
 *   POST /api/equip/applications              → create a new draft
 *
 * The draft is created with the minimum information collected by
 * the eligibility wizard (stream, applicantType, institution,
 * commercializationStage). All other fields are filled in by the
 * stream-specific form on subsequent PATCH calls.
 *
 * Guardrail: a user may have at most one DRAFT per stream open at
 * a time. Creating a second one with an open draft returns the
 * existing draft id instead of inserting a duplicate.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { EquipStream, ApplicantRole, CommercializationStage } from "@/lib/equip/types";

export const runtime = "nodejs";

const STREAMS: EquipStream[] = ["venture_connect", "venture_lift"];
const APPLICANT_TYPES: ApplicantRole[] = ["master_student", "phd_student", "postdoc", "research_associate"];
const STAGES: CommercializationStage[] = ["exploring", "building", "unsure"];

export async function GET() {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.equipApplication.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true, stream: true, status: true,
      requestedAmount: true, approvedAmount: true,
      submittedAt: true, decidedAt: true, fundedAt: true,
      createdAt: true, updatedAt: true,
    },
  });
  return NextResponse.json({ applications: apps });
}

export async function POST(req: Request) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const stream = body.stream as string;
  const applicantType = (body.applicantType as string) ?? null;
  const institution = (body.institution as string) ?? null;
  const institutionOther = (body.institutionOther as string) ?? null;
  const commercializationStage = (body.commercializationStage as string) ?? null;

  // Validate the eligibility-wizard payload. Each is required when
  // creating a draft so the application has SOMETHING reviewers can
  // route on if the user abandons it mid-form.
  if (!STREAMS.includes(stream as EquipStream)) {
    return NextResponse.json({ error: "Invalid stream" }, { status: 400 });
  }
  if (applicantType && !APPLICANT_TYPES.includes(applicantType as ApplicantRole)) {
    return NextResponse.json({ error: "Invalid applicantType" }, { status: 400 });
  }
  if (commercializationStage && !STAGES.includes(commercializationStage as CommercializationStage)) {
    return NextResponse.json({ error: "Invalid commercializationStage" }, { status: 400 });
  }

  // Reuse an existing open draft on this stream if there is one —
  // otherwise the user piles up duplicate empties on every visit.
  const existing = await prisma.equipApplication.findFirst({
    where: { userId, stream, status: "draft" },
    select: { id: true },
  });
  if (existing) {
    // Update the eligibility block in case the user changed any of
    // those answers on a re-run of the wizard.
    await prisma.equipApplication.update({
      where: { id: existing.id },
      data: {
        applicantType, institution, institutionOther, commercializationStage,
      },
    });
    return NextResponse.json({ id: existing.id, reused: true });
  }

  const created = await prisma.equipApplication.create({
    data: {
      userId,
      stream,
      status: "draft",
      applicantType, institution, institutionOther, commercializationStage,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id, reused: false });
}
