/**
 * Employer-scoped CRUD on a single InternshipPosting.
 *
 *   PATCH  /api/employer/postings/[id]   update fields (partial)
 *   DELETE /api/employer/postings/[id]   delete
 *
 * Ownership: the calling user must own the posting (createdById ===
 * session.user.id) OR be an admin/superadmin. Admins use this same
 * route for ad-hoc edits without having to bounce through the
 * /admin/internships surface.
 *
 * Field-level validation mirrors the existing admin PATCH at
 * /api/admin/internships/[id] so a posting edited via either route
 * behaves identically. Status enum here adds "expired".
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
export const runtime = "nodejs";

const VALID_STATUSES = ["active", "closed", "expired", "draft"] as const;
type Status = (typeof VALID_STATUSES)[number];
function isValidStatus(s: unknown): s is Status {
  return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s);
}

interface Body {
  companyName?: string;
  website?: string | null;
  title?: string;
  duration?: string | null;
  hours?: string | null;
  location?: string | null;
  type?: string | null;
  compensation?: string | null;
  deadline?: string | null;
  keySkills?: string[];
  positionDetails?: string;
  status?: Status;
  contactEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

async function loadOwnedPosting(id: string, userId: string, role: string) {
  const posting = await prisma.internshipPosting.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!posting) return { ok: false as const, status: 404, error: "Not found" };
  const isAdmin = role === "admin" || role === "superadmin";
  if (!isAdmin && posting.createdById !== userId) {
    return { ok: false as const, status: 403, error: "You don't own this posting" };
  }
  return { ok: true as const };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const gate = await loadOwnedPosting(id, userId, role);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json().catch(() => ({}))) as Body;

  if (body.status !== undefined && !isValidStatus(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  // Field whitelist + trim. Mirrors the admin endpoint behaviour:
  // explicit undefined = "don't touch this field", explicit null =
  // "clear this field", non-empty string = set/replace.
  const data: Record<string, unknown> = {};
  if (body.companyName !== undefined) data.companyName = body.companyName.trim();
  if (body.website !== undefined) data.website = body.website?.trim() || null;
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.duration !== undefined) data.duration = body.duration?.trim() || null;
  if (body.hours !== undefined) data.hours = body.hours?.trim() || null;
  if (body.location !== undefined) data.location = body.location?.trim() || null;
  if (body.type !== undefined) data.type = body.type?.trim() || null;
  if (body.compensation !== undefined) data.compensation = body.compensation?.trim() || null;
  if (body.deadline !== undefined) {
    if (body.deadline === null || body.deadline === "") {
      data.deadline = null;
    } else {
      const d = new Date(body.deadline);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "deadline must be a valid ISO date or null" }, { status: 400 });
      }
      data.deadline = d;
    }
  }
  if (body.keySkills !== undefined) {
    data.keySkills = Array.isArray(body.keySkills)
      ? body.keySkills.map((s) => s.trim()).filter(Boolean).slice(0, 5)
      : [];
  }
  if (body.positionDetails !== undefined) data.positionDetails = body.positionDetails.trim();
  if (body.status !== undefined) data.status = body.status;
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail?.trim() || null;
  if (body.contactName !== undefined) data.contactName = body.contactName?.trim() || null;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone?.trim() || null;

  const posting = await prisma.internshipPosting.update({ where: { id }, data });
  return NextResponse.json({ ok: true, posting });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const gate = await loadOwnedPosting(id, userId, role);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  await prisma.internshipPosting.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
