/**
 * Theme proposals — user-submitted theme ideas.
 *
 *   POST /api/themes/proposals
 *     body: { title, description, inspiration? }
 *
 * Validation
 *   • title: 5–100 chars
 *   • description: 20–2000 chars (markdown)
 *   • inspiration: optional, 0–500 chars
 *
 * Admin review happens at /admin/theme-proposals (PATCH to
 * /api/admin/theme-proposals/[id]). Reviewer can mark
 * shipped / declined / building / under_review and optionally issue
 * a tier-3 MerchReward bounty.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROPOSAL_LIMITS } from "@/lib/themes/constants";

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const { title, description, inspiration } = body as Record<string, unknown>;

  // ── title ──
  if (typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < PROPOSAL_LIMITS.title.min) {
    return NextResponse.json(
      { error: `title must be at least ${PROPOSAL_LIMITS.title.min} characters` },
      { status: 400 },
    );
  }
  if (trimmedTitle.length > PROPOSAL_LIMITS.title.max) {
    return NextResponse.json(
      { error: `title must be at most ${PROPOSAL_LIMITS.title.max} characters` },
      { status: 400 },
    );
  }

  // ── description ──
  if (typeof description !== "string") {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  const trimmedDescription = description.trim();
  if (trimmedDescription.length < PROPOSAL_LIMITS.description.min) {
    return NextResponse.json(
      { error: `description must be at least ${PROPOSAL_LIMITS.description.min} characters` },
      { status: 400 },
    );
  }
  if (trimmedDescription.length > PROPOSAL_LIMITS.description.max) {
    return NextResponse.json(
      { error: `description must be at most ${PROPOSAL_LIMITS.description.max} characters` },
      { status: 400 },
    );
  }

  // ── inspiration (optional) ──
  let cleanedInspiration: string | null = null;
  if (inspiration !== undefined && inspiration !== null && inspiration !== "") {
    if (typeof inspiration !== "string") {
      return NextResponse.json({ error: "inspiration must be a string" }, { status: 400 });
    }
    const trimmed = inspiration.trim();
    if (trimmed.length > PROPOSAL_LIMITS.inspiration.max) {
      return NextResponse.json(
        { error: `inspiration must be at most ${PROPOSAL_LIMITS.inspiration.max} characters` },
        { status: 400 },
      );
    }
    cleanedInspiration = trimmed.length > 0 ? trimmed : null;
  }

  const proposal = await prisma.themeProposal.create({
    data: {
      proposerId: userId,
      title: trimmedTitle,
      description: trimmedDescription,
      inspiration: cleanedInspiration,
      status: "submitted",
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, proposal });
}
