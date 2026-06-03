/**
 * GET /api/showcase/lookup?name=<full name>
 *
 * PUBLIC — used by the showcase submit form so a returning person (who
 * already submitted to any cohort) doesn't have to re-enter their
 * LinkedIn or re-upload their photo.
 *
 * Privacy: EXACT (case-insensitive) full-name match only — no partial /
 * substring search — so names can't be enumerated to harvest photos.
 * Best-effort per-IP throttle on top (resets on cold start; the
 * exact-match requirement is the primary safeguard). The data returned
 * (name / LinkedIn / headshot) is content the person submitted to be
 * featured publicly in the first place.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const hits = new Map<string, { n: number; t: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 25;
function throttled(ip: string): boolean {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || now - e.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  e.n += 1;
  return e.n > MAX_PER_WINDOW;
}

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") ?? "").trim();
  if (name.length < 3) return NextResponse.json({ found: false });

  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = (xff.split(",")[0] || req.headers.get("x-real-ip") || "anon").trim();
  if (throttled(ip)) {
    return NextResponse.json({ found: false, throttled: true }, { status: 429 });
  }

  const sub = await prisma.showcaseSubmission.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      linkedinHandle: true,
      linkedinUrl: true,
      photoUrl: true,
    },
  });
  if (!sub) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    submissionId: sub.id,
    name: sub.name,
    linkedinHandle: sub.linkedinHandle,
    linkedinUrl: sub.linkedinUrl,
    photoUrl: sub.photoUrl,
  });
}
