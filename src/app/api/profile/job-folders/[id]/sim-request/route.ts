/**
 * POST /api/profile/job-folders/[id]/sim-request
 *
 * Creates a SimulationRequest from a JobFolder's JD body and links
 * the new request back to the folder. Used by the "Role-play" tab on
 * /profile/job-folders/[id] — a one-click bridge from the folder's
 * tailored JD into the request queue.
 *
 * Flow:
 *   1. Ownership check on the folder.
 *   2. Normalise the folder's jdSnippet via extractJobDescriptionFromText
 *      (same path /api/simulator/requests uses, so sourceHash matches
 *      and the per-user dedup pass still kicks in).
 *   3. If the folder is already linked to a non-rejected request,
 *      return that one untouched.
 *   4. Otherwise: dedup against this user's recent requests with the
 *      same hash; if found, link the folder to it and return.
 *   5. Otherwise: create a fresh SimulationRequest and link.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractJobDescriptionFromText } from "@/lib/simulator/jd-extractor";
import { PROMPT_VERSION } from "@/lib/simulator/types";

export const runtime = "nodejs";

const RECENT_REQUEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const folder = await prisma.jobFolder.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      jdSnippet: true,
      simulationRequestId: true,
      simulationRequest: {
        select: { id: true, status: true },
      },
    },
  });
  if (!folder || folder.userId !== userId) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  // 3. Already linked to a live request — return as-is.
  if (
    folder.simulationRequest &&
    folder.simulationRequest.status !== "rejected" &&
    folder.simulationRequest.status !== "failed"
  ) {
    return NextResponse.json({
      ok: true,
      requestId: folder.simulationRequest.id,
      status: folder.simulationRequest.status,
      duplicate: true,
      message: "This folder already has a sim request in flight.",
    });
  }

  // 2. Same normalisation as /api/simulator/requests.
  const extracted = extractJobDescriptionFromText(
    folder.jdSnippet,
    PROMPT_VERSION,
  );
  if (!extracted.ok) {
    return NextResponse.json(
      {
        error:
          "Your JD is too short to build a sim from. Paste more of the posting (target ≥300 characters).",
      },
      { status: 400 },
    );
  }

  // 4. Dedup against this user's recent requests with the same hash.
  const existing = await prisma.simulationRequest.findFirst({
    where: {
      userId,
      sourceHash: extracted.sourceHash,
      status: { in: ["pending", "generating", "ready"] },
      createdAt: { gte: new Date(Date.now() - RECENT_REQUEST_WINDOW_MS) },
    },
    select: { id: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.jobFolder.update({
      where: { id: folder.id },
      data: { simulationRequestId: existing.id },
    });
    return NextResponse.json({
      ok: true,
      requestId: existing.id,
      status: existing.status,
      duplicate: true,
      message: "Linked this folder to your existing request for the same JD.",
    });
  }

  // 5. Create a fresh request and link in one transaction so the
  //    folder never ends up pointing at a request that isn't there.
  const created = await prisma.$transaction(async (tx) => {
    const req = await tx.simulationRequest.create({
      data: {
        userId,
        sourceUrl: null,
        jdBody: extracted.content,
        sourceHash: extracted.sourceHash,
        status: "pending",
      },
      select: { id: true, status: true, createdAt: true },
    });
    await tx.jobFolder.update({
      where: { id: folder.id },
      data: { simulationRequestId: req.id },
    });
    return req;
  });

  return NextResponse.json({
    ok: true,
    requestId: created.id,
    status: created.status,
    duplicate: false,
    message:
      "Request submitted. The role-play sim will land here as soon as the admin publishes it.",
  });
}
