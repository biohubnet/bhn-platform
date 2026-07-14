/**
 * Mint / list / revoke public no-login share links for the EQUIP tracking
 * report dossier.
 *
 *   POST   /api/admin/equip/report-share   body: { label?: string }
 *          → mint a new link. Returns { ok, token, url }.
 *   GET    /api/admin/equip/report-share
 *          → list all live links (id, token, label, expiresAt, createdAt).
 *   DELETE /api/admin/equip/report-share?token=<token>   (or ?id=<id>)
 *          → revoke a link. The public page 404s immediately after.
 *
 * Admin-only — possession of a token grants read access to the FULL
 * dossier with no session, so only admins may create or destroy links.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeToken(): string {
  // 16 bytes → ~22 url-safe chars (128-bit, unguessable).
  return randomBytes(16).toString("base64url");
}

function shareUrl(origin: string, token: string): string {
  return `${origin}/share/equip-report/${token}`;
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id ?? null;

  const body = (await req.json().catch(() => ({}))) as { label?: unknown };
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 80)
      : null;

  const link = await prisma.equipReportShareToken.create({
    data: { token: makeToken(), label, createdById: userId },
  });

  return NextResponse.json({
    ok: true,
    token: link.token,
    url: shareUrl(req.nextUrl.origin, link.token),
    link: {
      id: link.id,
      token: link.token,
      label: link.label,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      createdAt: link.createdAt.toISOString(),
    },
  });
}

export async function GET() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const links = await prisma.equipReportShareToken.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, label: true, expiresAt: true, createdAt: true },
  });
  return NextResponse.json({
    ok: true,
    links: links.map((l) => ({
      id: l.id,
      token: l.token,
      label: l.label,
      expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = req.nextUrl.searchParams.get("token");
  const id = req.nextUrl.searchParams.get("id");
  if (!token && !id) {
    return NextResponse.json({ error: "token or id required" }, { status: 400 });
  }

  // deleteMany so revoking an already-gone link is a no-op, not a 500.
  const { count } = await prisma.equipReportShareToken.deleteMany({
    where: token ? { token } : { id: id! },
  });
  return NextResponse.json({ ok: true, revoked: count });
}
