/**
 * PATCH /api/profile/preferred-name
 *
 * Sets (or clears) how the current user wants to be addressed in
 * greetings ("Welcome back, X."). Independent from their full
 * `name` field — see prisma/schema.prisma's `User.preferredName`
 * comment for the model.
 *
 * Body: { preferredName: string | null }
 *   - non-empty string → store (trimmed, max 80 chars)
 *   - empty string OR null → clear back to null
 *
 * Always saves to the SIGNED-IN user's own row. No way to set
 * another user's preferred name from this endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_LEN = 80;

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { preferredName?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const raw = body.preferredName;
  let next: string | null;
  if (raw === null || raw === undefined) {
    next = null;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      next = null;
    } else if (trimmed.length > MAX_LEN) {
      return NextResponse.json(
        { error: `Keep it under ${MAX_LEN} characters.` },
        { status: 400 },
      );
    } else {
      next = trimmed;
    }
  } else {
    return NextResponse.json({ error: "preferredName must be a string or null." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { preferredName: next },
    select: { id: true, preferredName: true },
  });

  return NextResponse.json({ ok: true, preferredName: updated.preferredName });
}
