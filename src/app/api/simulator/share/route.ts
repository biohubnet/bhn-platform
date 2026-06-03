/**
 * Mint (or reuse) a public, no-login share link for a Simulation.
 *
 *   POST /api/simulator/share   body: { simulationId: string, label?: string }
 *
 * Open to ANY signed-in user (any role) — sharing a sim is not an
 * admin-only action. The returned URL points at /share/sim/[token],
 * which lets an anonymous visitor PLAY the sim (client-side) and leave
 * a named comment.
 *
 * Idempotent-ish: if a non-expiring link already exists for the sim we
 * return that one rather than stacking up duplicate tokens.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeToken(): string {
  // 16 bytes → ~22 url-safe chars after base64url.
  return randomBytes(16).toString("base64url");
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id ?? null;

  const body = (await req.json().catch(() => ({}))) as {
    simulationId?: unknown;
    label?: unknown;
  };
  const simulationId =
    typeof body.simulationId === "string" ? body.simulationId : "";
  if (!simulationId) {
    return NextResponse.json(
      { error: "simulationId required" },
      { status: 400 },
    );
  }

  const sim = await prisma.simulation.findUnique({
    where: { id: simulationId },
    select: { id: true },
  });
  if (!sim) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 80)
      : null;

  // Reuse an existing permanent link for this sim if one exists.
  let shareToken = await prisma.simulationShareToken.findFirst({
    where: { simulationId, expiresAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!shareToken) {
    shareToken = await prisma.simulationShareToken.create({
      data: { simulationId, token: makeToken(), label, createdById: userId },
    });
  }

  const url = `${req.nextUrl.origin}/share/sim/${shareToken.token}`;
  return NextResponse.json({ ok: true, token: shareToken.token, url });
}
