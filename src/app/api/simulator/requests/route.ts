/**
 * POST /api/simulator/requests — user submits a sim-generation request.
 *
 * Replaces /api/simulator/start as the user-facing entry point. Instead
 * of generating a Simulation synchronously (which fails open when AI
 * quota is hit or the validator rejects the model output), the user
 * submits a SimulationRequest that an admin reviews from
 * /admin/simulator-requests.
 *
 *   Body: { url?: string, text?: string }   — exactly one
 *
 *   Flow:
 *     1. Extract the JD (URL via Jina, or pasted text) — same exact
 *        path the old /start endpoint used, so the sourceHash matches
 *        the existing Simulation cache.
 *     2. Cheap dedup-on-user pass: if THIS user already has a recent
 *        (≤ 7 days) pending/ready request for this exact hash, return
 *        that request instead of stacking duplicates.
 *     3. Insert SimulationRequest with status='pending'. ALWAYS queue
 *        — no auto-promotion, even on cache hits (admin must confirm
 *        per design decision).
 *
 * GET /api/simulator/requests — list THIS user's requests for the
 *   "Requested" section on /simulator.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractJobDescription,
  extractJobDescriptionFromText,
} from "@/lib/simulator/jd-extractor";
import { PROMPT_VERSION } from "@/lib/simulator/types";

export const runtime = "nodejs";
/** Capped at 30s — URL extraction (Jina Reader) usually returns in
 *  3–8s but ZipRecruiter / LinkedIn sometimes time out. We don't need
 *  the longer AI-generation budget anymore. */
export const maxDuration = 30;

const RECENT_REQUEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    text?: string;
  };
  const url = (body.url ?? "").trim();
  const text = (body.text ?? "").trim();
  if (!url && !text) {
    return NextResponse.json(
      { error: "Provide a job-posting URL or paste the JD body." },
      { status: 400 },
    );
  }

  // 1. Same extraction path the AI generator used — same hash.
  const extracted = url
    ? await extractJobDescription(url, PROMPT_VERSION)
    : extractJobDescriptionFromText(text, PROMPT_VERSION);
  if (!extracted.ok) {
    return NextResponse.json({ error: extracted.error }, { status: 400 });
  }

  // 2. Per-user dedup. Don't stack the same JD as multiple pending /
  //    ready requests for the same user. (Different users can each
  //    request the same JD — they each get notified independently.)
  const recent = await prisma.simulationRequest.findFirst({
    where: {
      userId,
      sourceHash: extracted.sourceHash,
      status: { in: ["pending", "generating", "ready"] },
      createdAt: { gte: new Date(Date.now() - RECENT_REQUEST_WINDOW_MS) },
    },
    select: { id: true, status: true, simulationId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      requestId: recent.id,
      status: recent.status,
      simulationId: recent.simulationId,
      message:
        recent.status === "ready"
          ? "You already have a ready simulation for this posting."
          : "You already requested this posting — we'll keep you posted.",
    });
  }

  // 3. Queue it. Always pending, even when a Simulation already exists
  //    with this hash — admin must explicitly link per design choice.
  const created = await prisma.simulationRequest.create({
    data: {
      userId,
      sourceUrl: url || null,
      jdBody: extracted.content,
      sourceHash: extracted.sourceHash,
      status: "pending",
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    duplicate: false,
    requestId: created.id,
    status: created.status,
    message: "Request submitted. We'll notify you when it's ready.",
  });
}

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.simulationRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      sourceUrl: true,
      status: true,
      adminNotes: true,
      createdAt: true,
      updatedAt: true,
      simulationId: true,
      simulation: {
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          location: true,
        },
      },
      // We also surface a JD snippet so the user can recognise WHICH
      // posting a row refers to without opening it.
      jdBody: true,
    },
  });

  return NextResponse.json({
    ok: true,
    requests: requests.map((r) => ({
      id: r.id,
      sourceUrl: r.sourceUrl,
      jdSnippet: r.jdBody.slice(0, 160),
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      simulationId: r.simulationId,
      simulation: r.simulation,
    })),
  });
}
