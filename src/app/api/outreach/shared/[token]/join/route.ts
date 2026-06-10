/**
 * Public (no login): join a shared outreach list by giving your name.
 *   POST /api/outreach/shared/[token]/join { name }
 * Creates an OutreachCollaborator + httpOnly per-list cookie so additions are
 * attributed to the person.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { resolveOutreachToken, outreachCollabCookieName } from "@/lib/outreach/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveOutreachToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().slice(0, 80);
  if (name.length < 2) return NextResponse.json({ error: "Please tell us your name (2+ characters)." }, { status: 400 });

  const collab = await prisma.outreachCollaborator.create({
    data: { listId: res.list.id, name },
    select: { id: true, name: true },
  });

  const jar = await cookies();
  jar.set(outreachCollabCookieName(res.list.id), collab.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });

  return NextResponse.json({ ok: true, collaborator: collab });
}
