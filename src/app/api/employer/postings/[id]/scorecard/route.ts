/**
 * Interview scorecard for a posting.
 *
 *   GET   /api/employer/postings/[id]/scorecard
 *     Fetches the InterviewScorecard for this posting (nullable).
 *     Auth: any employer on this posting's company (viewer+) or admin.
 *     Returns: { scorecard: {...} | null }
 *
 *   POST  /api/employer/postings/[id]/scorecard
 *     Upsert scorecard criteria.
 *     Body: { criteria: Array<{id: string, label: string, description?: string, scale: 4|5}> }
 *     Creates if absent, updates if exists and not locked. Returns 409 if locked.
 *     Auth: employer (own posting, manager+) or admin.
 *     Returns: { ok: true, scorecard: {...} }
 *
 *   PATCH /api/employer/postings/[id]/scorecard
 *     Lock the scorecard. Body: { locked: true }
 *     Auth: company owner only.
 *     Returns: { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveCompanyId, requireCompanyRole } from "@/lib/employer/company";

export const runtime = "nodejs";

// ── Shared helpers ────────────────────────────────────────────────

async function resolveSessionAndRole(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return null;
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) return null;
  return { userId, role };
}

async function loadPosting(postingId: string) {
  return prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: { id: true, companyId: true, createdById: true, title: true, status: true },
  });
}

// ── Criterion validation ──────────────────────────────────────────

interface Criterion {
  id: string;
  label: string;
  description?: string;
  scale: 4 | 5;
}

function validateCriteria(raw: unknown): { ok: true; criteria: Criterion[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "criteria must be an array" };
  if (raw.length < 1) return { ok: false, error: "At least 1 criterion is required" };
  if (raw.length > 10) return { ok: false, error: "Maximum 10 criteria allowed" };

  const criteria: Criterion[] = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (typeof c !== "object" || c === null) {
      return { ok: false, error: `Criterion at index ${i} must be an object` };
    }
    const { id, label, description, scale } = c as Record<string, unknown>;

    if (typeof id !== "string" || id.trim().length === 0) {
      return { ok: false, error: `Criterion at index ${i}: id must be a non-empty string` };
    }
    if (typeof label !== "string" || label.trim().length === 0 || label.trim().length > 100) {
      return { ok: false, error: `Criterion at index ${i}: label must be 1–100 characters` };
    }
    if (scale !== 4 && scale !== 5) {
      return { ok: false, error: `Criterion at index ${i}: scale must be 4 or 5` };
    }
    if (description !== undefined && typeof description !== "string") {
      return { ok: false, error: `Criterion at index ${i}: description must be a string if provided` };
    }

    criteria.push({
      id: id.trim(),
      label: label.trim(),
      description: typeof description === "string" ? description.trim() : undefined,
      scale,
    });
  }
  return { ok: true, criteria };
}

// ── GET — fetch scorecard ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const auth = await resolveSessionAndRole(session);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = auth;
  const { id: postingId } = await params;

  const posting = await loadPosting(postingId);
  if (!posting) return NextResponse.json({ error: "Posting not found" }, { status: 404 });

  const isAdmin = role === "admin" || role === "superadmin";

  if (!isAdmin) {
    if (!posting.companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      await requireCompanyRole(posting.companyId, userId, "viewer");
    } catch {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  const scorecard = await prisma.interviewScorecard.findUnique({
    where: { postingId },
    include: { submissions: { select: { id: true } } },
  });

  return NextResponse.json({ scorecard: scorecard ?? null });
}

// ── POST — upsert criteria ────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const auth = await resolveSessionAndRole(session);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = auth;
  const { id: postingId } = await params;

  const posting = await loadPosting(postingId);
  if (!posting) return NextResponse.json({ error: "Posting not found" }, { status: 404 });

  const isAdmin = role === "admin" || role === "superadmin";

  if (!isAdmin) {
    if (!posting.companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      await requireCompanyRole(posting.companyId, userId, "manager");
    } catch {
      return NextResponse.json({ error: "Access denied — manager+ required" }, { status: 403 });
    }
  }

  let body: { criteria?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateCriteria(body.criteria);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Check if scorecard already exists and is locked
  const existing = await prisma.interviewScorecard.findUnique({
    where: { postingId },
    select: { id: true, locked: true },
  });

  if (existing?.locked) {
    return NextResponse.json({ error: "Scorecard is locked." }, { status: 409 });
  }

  const scorecard = await prisma.interviewScorecard.upsert({
    where: { postingId },
    create: {
      postingId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      criteria: validation.criteria as any,
      locked: false,
    },
    update: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      criteria: validation.criteria as any,
    },
  });

  return NextResponse.json({ ok: true, scorecard });
}

// ── PATCH — lock scorecard ────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const auth = await resolveSessionAndRole(session);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = auth;
  const { id: postingId } = await params;

  const posting = await loadPosting(postingId);
  if (!posting) return NextResponse.json({ error: "Posting not found" }, { status: 404 });

  const isAdmin = role === "admin" || role === "superadmin";

  if (!isAdmin) {
    if (!posting.companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // Only owners can lock the scorecard
    const member = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId: posting.companyId, userId } },
      select: { role: true },
    });
    if (!member || member.role !== "owner") {
      return NextResponse.json({ error: "Only company owners can lock the scorecard." }, { status: 403 });
    }
  }

  let body: { locked?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.locked !== true) {
    return NextResponse.json({ error: "locked must be true" }, { status: 400 });
  }

  const scorecard = await prisma.interviewScorecard.findUnique({
    where: { postingId },
    select: { id: true },
  });
  if (!scorecard) {
    return NextResponse.json({ error: "No scorecard exists for this posting yet." }, { status: 404 });
  }

  await prisma.interviewScorecard.update({
    where: { postingId },
    data: { locked: true },
  });

  return NextResponse.json({ ok: true });
}
