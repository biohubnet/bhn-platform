/**
 * Trainee "My Application" artifacts: resume URL, video URL, elevator
 * pitch. Stored on the User row so they're available outside of any
 * single talent-application submission.
 *
 *   GET    /api/profile/application
 *   PATCH  /api/profile/application  { elevatorPitch?: string;
 *                                       resumeUrl?: string | null;
 *                                       videoIntroUrl?: string | null }
 *
 * File uploads land at /api/profile/application/upload (sibling
 * route) which writes to R2 and then PATCHes the URL onto the user
 * row internally. PATCH here covers manual URL set/clear (e.g.
 * remove a stale resume) plus pitch text edits.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { R2_PUBLIC_URL } from "@/lib/r2";

const PITCH_MAX = 650;

async function meId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const u = await prisma.user.findUnique({
    where: { email: session.user.email }, select: { id: true },
  });
  return u?.id ?? null;
}

export async function GET() {
  const id = await meId();
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      resumeUrl: true,
      videoIntroUrl: true,
      elevatorPitch: true,
      applicationUpdatedAt: true,
    },
  });
  return NextResponse.json(u);
}

export async function PATCH(req: NextRequest) {
  const id = await meId();
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    elevatorPitch?: string | null;
    resumeUrl?: string | null;
    videoIntroUrl?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (body.elevatorPitch !== undefined) {
    if (body.elevatorPitch === null) {
      data.elevatorPitch = null;
    } else {
      const trimmed = body.elevatorPitch.trim();
      if (trimmed.length > PITCH_MAX) {
        return NextResponse.json({ error: `Pitch must be ≤ ${PITCH_MAX} characters.` }, { status: 400 });
      }
      data.elevatorPitch = trimmed || null;
    }
  }
  // Resume / video URLs: allow null (delete) or an R2 URL we trust.
  // Reject arbitrary external URLs — files are expected to have come
  // through our upload route which writes to R2 only.
  for (const key of ["resumeUrl", "videoIntroUrl"] as const) {
    if (body[key] !== undefined) {
      const v = body[key];
      if (v === null) {
        data[key] = null;
      } else if (typeof v === "string" && R2_PUBLIC_URL && v.startsWith(R2_PUBLIC_URL)) {
        data[key] = v;
      } else {
        return NextResponse.json({ error: `${key} must be either null or a URL we issued.` }, { status: 400 });
      }
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  data.applicationUpdatedAt = new Date();
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      resumeUrl: true,
      videoIntroUrl: true,
      elevatorPitch: true,
      applicationUpdatedAt: true,
    },
  });
  return NextResponse.json(updated);
}
