/**
 * POST /api/signatures
 *   { action, subjectType, subjectId, meaning, password? }
 *
 * Capture a 21 CFR Part 11 §11.50 / §11.70 electronic signature.
 * If the deployment is in regulated mode (env BHN_PART11_REQUIRE_PASSWORD
 * = true) the user must re-enter their password at signing — Part 11
 * §11.300(a) treats unique ID + password as the second-factor binding.
 * Otherwise we capture method="session" — still defensible for non-
 * regulated training, less defensible for audit.
 *
 * GET /api/signatures?subjectType=Course&subjectId=...
 *   Lists signatures bound to a subject, scoped to the calling user
 *   unless they're admin (admins can see any signer's history for
 *   audit purposes).
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PART11_REQUIRE_PASSWORD =
  (process.env.BHN_PART11_REQUIRE_PASSWORD ?? "").toLowerCase() === "true";

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    subjectType?: string;
    subjectId?: string;
    meaning?: string;
    password?: string;
  };
  if (!body.action || !body.subjectType || !body.subjectId || !body.meaning) {
    return NextResponse.json({ error: "action, subjectType, subjectId, and meaning are required" }, { status: 400 });
  }

  let method: "session" | "password" = "session";
  if (PART11_REQUIRE_PASSWORD) {
    const user = await prisma.user.findUnique({
      where: { id: userId }, select: { password: true },
    });
    if (!user?.password) {
      return NextResponse.json({ error: "Password not set on account." }, { status: 400 });
    }
    if (!body.password) {
      return NextResponse.json({ error: "Re-enter your password to sign." }, { status: 400 });
    }
    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    method = "password";
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const sig = await prisma.electronicSignature.create({
    data: {
      signerId: userId,
      action: body.action,
      subjectType: body.subjectType,
      subjectId: body.subjectId,
      meaning: body.meaning,
      method,
      ipAddress,
      userAgent,
    },
  });
  // Audit log for the signing event itself.
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "esignature.create",
      targetType: body.subjectType,
      targetId: body.subjectId,
      detail: JSON.stringify({ signatureId: sig.id, method }),
      ip: ipAddress,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, signature: sig });
}

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "user";
  const callerIsAdmin = isAdmin(role);

  const subjectType = req.nextUrl.searchParams.get("subjectType")?.trim();
  const subjectId = req.nextUrl.searchParams.get("subjectId")?.trim();
  const where: Record<string, unknown> = {};
  if (subjectType) where.subjectType = subjectType;
  if (subjectId) where.subjectId = subjectId;
  if (!callerIsAdmin) where.signerId = userId;

  const rows = await prisma.electronicSignature.findMany({
    where,
    orderBy: { performedAt: "desc" },
    take: 100,
    include: {
      signer: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ signatures: rows });
}
