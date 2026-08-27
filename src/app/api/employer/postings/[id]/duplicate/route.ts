/**
 * POST /api/employer/postings/[id]/duplicate
 *
 * Creates a copy of an InternshipPosting owned by the caller.
 * Admins and superadmins can duplicate any posting; regular employers
 * can only duplicate postings they created (createdById === userId).
 *
 * The new posting gets:
 *   - title:          "<original> (Copy)"
 *   - status:         "draft"
 *   - createdById:    the caller's userId
 *   - isDemoSeed:     false
 *   - lastTouchedAt / lastTouchedById: null (fresh slate)
 *   - all other fields copied verbatim from the original
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id ?? null;
  const role   = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  // 1. Fetch the original posting.
  const original = await prisma.internshipPosting.findUnique({
    where: { id },
    select: {
      companyId:      true,
      companyName:    true,
      website:        true,
      title:          true,
      duration:       true,
      hours:          true,
      location:       true,
      type:           true,
      compensation:   true,
      deadline:       true,
      keySkills:      true,
      positionDetails:true,
      contactEmail:   true,
      contactName:    true,
      contactPhone:   true,
      createdById:    true,
    },
  });

  if (!original) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Auth check: admins may duplicate anything; employers must own it.
  const isAdmin = role === "admin" || role === "superadmin";
  if (!isAdmin && original.createdById !== userId) {
    return NextResponse.json(
      { error: "You don't own this posting" },
      { status: 403 },
    );
  }

  // 3. Create the duplicate.
  const copy = await prisma.internshipPosting.create({
    data: {
      companyId:       original.companyId,
      companyName:     original.companyName,
      website:         original.website,
      title:           `${original.title} (Copy)`,
      duration:        original.duration,
      hours:           original.hours,
      location:        original.location,
      type:            original.type,
      compensation:    original.compensation,
      deadline:        original.deadline,
      keySkills:       original.keySkills,
      positionDetails: original.positionDetails,
      status:          "draft",
      contactEmail:    original.contactEmail,
      contactName:     original.contactName,
      contactPhone:    original.contactPhone,
      createdById:     userId,
      isDemoSeed:      false,
      lastTouchedAt:   null,
      lastTouchedById: null,
    },
    select: { id: true, title: true },
  });

  // 4. Return the new posting's id + title.
  return NextResponse.json({ ok: true, posting: copy });
}
