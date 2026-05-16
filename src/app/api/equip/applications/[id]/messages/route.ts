/**
 * Reviewer ↔ applicant comment thread on an EquipApplication.
 *
 *   GET  /api/equip/applications/[id]/messages   → list
 *   POST /api/equip/applications/[id]/messages   → append { body }
 *
 * Both applicant and reviewer (admin) can post. Applicant sees
 * only their own thread; admins see any application. The thread
 * is the only post-submit communication channel — no email back-
 * and-forth.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function loadAuthorized(id: string, session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return null;
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  const isAdmin = role === "admin" || role === "superadmin";
  const app = await prisma.equipApplication.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!app) return null;
  if (!isAdmin && app.userId !== userId) return null;
  return { app, userId: userId!, isAdmin };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const auth = await loadAuthorized(id, session);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.equipApplicationMessage.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const auth = await loadAuthorized(id, session);
  if (!auth) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => ({} as { body?: string }));
  const body = (json.body ?? "").trim();
  if (body.length === 0 || body.length > 4000) {
    return NextResponse.json({ error: "Body must be 1-4000 chars" }, { status: 400 });
  }

  const msg = await prisma.equipApplicationMessage.create({
    data: { applicationId: id, userId: auth.userId, body },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ message: msg });
}
