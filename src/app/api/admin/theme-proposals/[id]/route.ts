/**
 * Admin review actions on a single ThemeProposal.
 *
 *   PATCH /api/admin/theme-proposals/[id]
 *     body: { action, reviewerNote?, shippedThemeId? }
 *
 * Actions:
 *   "review"            → status: under_review (admin acknowledged)
 *   "build"             → status: building (will ship later)
 *   "ship"              → status: shipped; shippedThemeId required
 *   "ship_with_bounty"  → status: shipped + issue tier-3 MerchReward
 *                         bounty for the proposer (idempotent: one
 *                         tier-3 reward per user across all their
 *                         shipped proposals)
 *   "decline"           → status: declined; reviewerNote required
 *
 * On every action: reviewerId + reviewedAt are stamped from the
 * admin's session.
 *
 * Note: shippedThemeId is NOT validated against VALID_THEME_IDS —
 * when a proposal ships, the admin has just added a new theme to
 * the codebase, and the new id may not yet be in the constants list.
 * The constants list update is expected to land alongside the theme
 * CSS in the same PR.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueThemeProposalBounty } from "@/lib/rewards/merch";
import { PROPOSAL_LIMITS } from "@/lib/themes/constants";

const VALID_ACTIONS = [
  "review",
  "build",
  "ship",
  "ship_with_bounty",
  "decline",
] as const;
type Action = (typeof VALID_ACTIONS)[number];

function isAction(s: unknown): s is Action {
  return typeof s === "string" && (VALID_ACTIONS as readonly string[]).includes(s);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const adminId = (session.user as { id?: string }).id ?? null;
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;

  const proposal = await prisma.themeProposal.findUnique({ where: { id } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const { action, reviewerNote, shippedThemeId } = body as Record<string, unknown>;

  if (!isAction(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  // ── reviewerNote validation (length only — action-specific
  //    requiredness is checked per action below) ──
  let cleanedNote: string | null = null;
  if (reviewerNote !== undefined && reviewerNote !== null && reviewerNote !== "") {
    if (typeof reviewerNote !== "string") {
      return NextResponse.json({ error: "reviewerNote must be a string" }, { status: 400 });
    }
    const trimmed = reviewerNote.trim();
    if (trimmed.length > PROPOSAL_LIMITS.reviewerNote.max) {
      return NextResponse.json(
        { error: `reviewerNote must be at most ${PROPOSAL_LIMITS.reviewerNote.max} characters` },
        { status: 400 },
      );
    }
    cleanedNote = trimmed.length > 0 ? trimmed : null;
  }

  // ── Action dispatch ──
  const now = new Date();

  if (action === "review") {
    await prisma.themeProposal.update({
      where: { id },
      data: {
        status: "under_review",
        reviewerId: adminId,
        reviewerNote: cleanedNote ?? proposal.reviewerNote,
        reviewedAt: now,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "build") {
    await prisma.themeProposal.update({
      where: { id },
      data: {
        status: "building",
        reviewerId: adminId,
        reviewerNote: cleanedNote ?? proposal.reviewerNote,
        reviewedAt: now,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "decline") {
    if (!cleanedNote) {
      return NextResponse.json(
        { error: "reviewerNote is required when declining a proposal" },
        { status: 400 },
      );
    }
    await prisma.themeProposal.update({
      where: { id },
      data: {
        status: "declined",
        reviewerId: adminId,
        reviewerNote: cleanedNote,
        reviewedAt: now,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ship + ship_with_bounty share most of the same flow
  if (action === "ship" || action === "ship_with_bounty") {
    if (typeof shippedThemeId !== "string" || shippedThemeId.trim().length === 0) {
      return NextResponse.json(
        { error: "shippedThemeId is required when shipping" },
        { status: 400 },
      );
    }
    const cleanedThemeId = shippedThemeId.trim().slice(0, 60);

    // Issue bounty first (so a successful issuance is reflected on
    // the ThemeProposal row in the same step). If the bounty step
    // fails, the proposal stays in its previous state — admin can
    // retry without leaving a half-shipped record.
    let bountyRewardId: string | null = null;
    let bountyJustCreated = false;
    if (action === "ship_with_bounty") {
      const issued = await issueThemeProposalBounty(prisma, proposal.proposerId);
      if (issued === null) {
        // Proposer is sandbox / demo / showcase — bounty not eligible.
        // We still ship the proposal but record that no bounty issued.
        bountyRewardId = null;
      } else {
        bountyRewardId = issued.rewardId;
        bountyJustCreated = issued.created;
      }
    }

    await prisma.themeProposal.update({
      where: { id },
      data: {
        status: "shipped",
        reviewerId: adminId,
        reviewerNote: cleanedNote ?? proposal.reviewerNote,
        reviewedAt: now,
        shippedThemeId: cleanedThemeId,
        bountyIssued: action === "ship_with_bounty" && bountyRewardId !== null,
        bountyRewardId,
      },
    });

    return NextResponse.json({
      ok: true,
      bounty: action === "ship_with_bounty"
        ? { rewardId: bountyRewardId, created: bountyJustCreated }
        : null,
    });
  }

  // Unreachable thanks to isAction guard, but TS doesn't know
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
