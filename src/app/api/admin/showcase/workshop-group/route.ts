/**
 * POST /api/admin/showcase/workshop-group  { workshopId }
 *
 * Admin-only. Idempotently ensures a ShowcaseGroup exists for a real Workshop
 * (tour / bootcamp) so its attendees can be added to a showcase the same way
 * pathway cohorts are. The group is a standalone showcase with a deterministic
 * slug (wsh-<workshop.slug>); calling again returns the existing one.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const meId = (session.user as { id?: string }).id ?? null;

  const body = (await req.json().catch(() => ({}))) as { workshopId?: string };
  const workshopId = (body.workshopId ?? "").trim();
  if (!workshopId) return NextResponse.json({ error: "workshopId required" }, { status: 400 });

  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { id: true, slug: true, title: true, kind: true, partnerOrganization: true },
  });
  if (!workshop) return NextResponse.json({ error: "Unknown workshop." }, { status: 404 });

  const slug = `wsh-${workshop.slug}`;
  const eyebrow = `${workshop.kind === "tour" ? "Tour" : workshop.kind === "bootcamp" ? "Bootcamp" : "Workshop"}${workshop.partnerOrganization ? ` · ${workshop.partnerOrganization}` : ""}`;

  const existing = await prisma.showcaseGroup.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, active: true } });
  const group =
    existing ??
    (await prisma.showcaseGroup.create({
      data: { slug, name: workshop.title, eyebrow, intro: `Showcase for ${workshop.title}.`, active: true, createdById: meId },
      select: { id: true, slug: true, name: true, active: true },
    }));

  const submissionCount = await prisma.showcaseSubmission.count({ where: { programSlug: slug } });
  return NextResponse.json({ group: { ...group, submissionCount } });
}
