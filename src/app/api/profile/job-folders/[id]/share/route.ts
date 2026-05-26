/**
 * POST   /api/profile/job-folders/[id]/share — mint a new share token
 * GET    /api/profile/job-folders/[id]/share — list active tokens
 * DELETE /api/profile/job-folders/[id]/share?tokenId=… — revoke one
 *
 * All scoped to the folder owner. Mentors who receive the token use
 * /share/folder/[token] which doesn't require authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function makeToken(): string {
  // 16 bytes → 22 url-safe chars after base64url stripping.
  return randomBytes(16).toString("base64url");
}

async function loadOwned(userId: string, folderId: string) {
  const f = await prisma.jobFolder.findUnique({
    where: { id: folderId },
    select: { id: true, userId: true },
  });
  if (!f || f.userId !== userId) return null;
  return f;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await loadOwned(userId, id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    /** Hours until expiry. Null/undefined = no expiry. */
    expiresInHours?: number | null;
  };
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 80)
      : null;
  const expiresAt =
    typeof body.expiresInHours === "number" && body.expiresInHours > 0
      ? new Date(Date.now() + body.expiresInHours * 3_600_000)
      : null;

  const token = makeToken();
  const created = await prisma.jobFolderShareToken.create({
    data: { folderId: id, token, label, expiresAt },
    select: { id: true, token: true, label: true, expiresAt: true, createdAt: true },
  });
  return NextResponse.json({
    ok: true,
    token: {
      ...created,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await loadOwned(userId, id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const tokens = await prisma.jobFolderShareToken.findMany({
    where: { folderId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    ok: true,
    tokens: tokens.map((t) => ({
      id: t.id,
      token: t.token,
      label: t.label,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await loadOwned(userId, id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const tokenId = req.nextUrl.searchParams.get("tokenId");
  if (!tokenId) {
    return NextResponse.json({ error: "Provide tokenId." }, { status: 400 });
  }
  await prisma.jobFolderShareToken.deleteMany({
    where: { id: tokenId, folderId: id },
  });
  return NextResponse.json({ ok: true });
}
