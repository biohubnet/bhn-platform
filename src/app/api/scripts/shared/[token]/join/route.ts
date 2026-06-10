/**
 * Public (no login): join a shared script by giving your name.
 *   POST /api/scripts/shared/[token]/join { name }
 * Creates a ScriptCollaborator and sets an httpOnly per-script cookie so the
 * person is recognised on return and their edits are attributed.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { resolveShareToken, collabCookieName } from "@/lib/scripts/share";

export const runtime = "nodejs";
interface Ctx { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const res = await resolveShareToken(token);
  if (!res.ok) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim().slice(0, 80);
  if (name.length < 2) return NextResponse.json({ error: "Please tell us your name (2+ characters)." }, { status: 400 });

  const collab = await prisma.scriptCollaborator.create({
    data: { scriptId: res.script.id, name },
    select: { id: true, name: true },
  });

  const jar = await cookies();
  jar.set(collabCookieName(res.script.id), collab.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  });

  return NextResponse.json({ ok: true, collaborator: collab });
}
