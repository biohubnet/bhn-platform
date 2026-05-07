import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

interface Body {
  companyName?: string;
  website?: string | null;
  title?: string;
  duration?: string | null;
  hours?: string | null;
  location?: string | null;
  type?: string | null;
  compensation?: string | null;
  deadline?: string | null;       // ISO date or empty
  keySkills?: string[];
  positionDetails?: string;
  status?: "active" | "closed" | "draft";
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = (session.user as { id?: string }).id ?? null;
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.companyName?.trim() || !body.title?.trim() || !body.positionDetails?.trim()) {
    return NextResponse.json(
      { error: "companyName, title, and positionDetails are required." },
      { status: 400 }
    );
  }

  const posting = await prisma.internshipPosting.create({
    data: {
      companyName: body.companyName.trim(),
      website: body.website?.trim() || null,
      title: body.title.trim(),
      duration: body.duration?.trim() || null,
      hours: body.hours?.trim() || null,
      location: body.location?.trim() || null,
      type: body.type?.trim() || null,
      compensation: body.compensation?.trim() || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      keySkills: Array.isArray(body.keySkills)
        ? body.keySkills.map((s) => s.trim()).filter(Boolean).slice(0, 5)
        : [],
      positionDetails: body.positionDetails.trim(),
      status: body.status ?? "active",
      createdById: userId,
    },
  });
  return NextResponse.json({ ok: true, posting });
}
