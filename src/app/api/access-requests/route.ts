/**
 * Public access-request endpoint. Used by /for-employers and
 * /for-trainees marketing pages to capture demand without asking the
 * visitor to create an account first.
 *
 *   POST /api/access-requests   { kind, email, name?, company?, website?, message? }
 *
 * Rate-limited by recent email lookups so refresh-spam doesn't flood the
 * admin queue. Admins triage at /admin/access-requests.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    email?: string;
    name?: string;
    company?: string;
    website?: string;
    message?: string;
    source?: string;
  };

  const kind = body.kind === "trainee" ? "trainee" : "employer";
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Soft rate-limit: don't let the same email file > 3 requests in the
  // last 24 hours.
  const recent = await prisma.accessRequest.count({
    where: {
      email,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent >= 3) {
    return NextResponse.json({ error: "We already have your request — we'll be in touch." }, { status: 429 });
  }

  // Already a registered user? Bounce them to the login page.
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({
      ok: true,
      alreadyUser: true,
      message: "Looks like you already have an account — sign in to access it.",
    });
  }

  const request = await prisma.accessRequest.create({
    data: {
      kind,
      email,
      name: body.name?.trim() || null,
      company: body.company?.trim() || null,
      website: body.website?.trim() || null,
      message: body.message?.trim() || null,
      source: body.source ?? `for-${kind === "trainee" ? "trainees" : "employers"}`,
    },
  });

  return NextResponse.json({ ok: true, id: request.id });
}
