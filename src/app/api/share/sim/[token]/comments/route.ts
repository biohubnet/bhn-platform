/**
 * Public comments on a shared Simulation.
 *
 *   GET    /api/share/sim/[token]/comments  → list (no auth)
 *   POST   /api/share/sim/[token]/comments  → add (no auth) body: { name, body, website? }
 *   DELETE /api/share/sim/[token]/comments?commentId=…  → soft-hide (admins only)
 *
 * Anyone holding the share link can read + post; the commenter's name
 * is captured as free text (no account needed). The token resolves to a
 * Simulation server-side, so anonymous posters never touch the raw
 * simulation id. Abuse guards: honeypot field + per-IP rate limit +
 * length caps. React escapes bodies on render, so stored text is inert.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const NAME_MAX = 80;
const BODY_MAX = 2000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 6;

type Ctx = { params: Promise<{ token: string }> };

async function resolveSim(
  token: string,
): Promise<{ simulationId: string } | { error: "not_found" | "expired" }> {
  const share = await prisma.simulationShareToken.findUnique({
    where: { token },
    select: { simulationId: true, expiresAt: true },
  });
  if (!share) return { error: "not_found" };
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return { error: "expired" };
  }
  return { simulationId: share.simulationId };
}

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return req.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const r = await resolveSim(token);
  if ("error" in r) {
    return NextResponse.json(
      { error: r.error },
      { status: r.error === "expired" ? 410 : 404 },
    );
  }
  const comments = await prisma.simulationComment.findMany({
    where: { simulationId: r.simulationId, hidden: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, authorName: true, body: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, comments });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const r = await resolveSim(token);
  if ("error" in r) {
    return NextResponse.json(
      { error: r.error },
      { status: r.error === "expired" ? 410 : 404 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    body?: unknown;
    website?: unknown; // honeypot — real users never fill this
  };

  // Honeypot: a filled hidden field means a bot. Pretend success so the
  // bot doesn't retry, but write nothing.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, comment: null });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Comment is required." }, { status: 400 });
  }

  const ip = clientIp(req);
  // Lightweight anti-spam: cap comments per IP per minute.
  if (ip) {
    const recent = await prisma.simulationComment.count({
      where: { ip, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    });
    if (recent >= RATE_MAX) {
      return NextResponse.json(
        { error: "You're commenting too fast — try again in a minute." },
        { status: 429 },
      );
    }
  }

  // Soft attribution if the visitor happens to be signed in.
  const session = await getSession().catch(() => null);
  const authorUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;

  const created = await prisma.simulationComment.create({
    data: {
      simulationId: r.simulationId,
      authorName: name.slice(0, NAME_MAX),
      body: text.slice(0, BODY_MAX),
      authorUserId,
      ip,
    },
    select: { id: true, authorName: true, body: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, comment: created }, { status: 201 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const session = await getSession().catch(() => null);
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  if (!session || !isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const r = await resolveSim(token);
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: 404 });
  }
  const commentId = req.nextUrl.searchParams.get("commentId") ?? "";
  if (!commentId) {
    return NextResponse.json({ error: "commentId required" }, { status: 400 });
  }
  await prisma.simulationComment.updateMany({
    where: { id: commentId, simulationId: r.simulationId },
    data: { hidden: true },
  });
  return NextResponse.json({ ok: true });
}
