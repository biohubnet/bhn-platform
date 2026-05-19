/**
 * POST /api/simulator/start
 *
 * Body: { url: string }
 *
 * Flow:
 *   1. Pull clean text from the URL via Jina Reader.
 *   2. Hash the cleaned text + prompt version.
 *   3. Look for an existing Simulation row with that hash.
 *      - Hit  → skip generation, save bytes.
 *      - Miss → generate with Gemini/Cloudflare, validate, persist.
 *   4. Create a SimulationAttempt for the trainee.
 *   5. Return { attemptId } so the client can redirect to the play page.
 *
 * Latency is dominated by the AI call (~12–25s) on a fresh JD. Cache
 * hits return in <1s. We don't stream — the loading state on the
 * paste-URL page handles the wait.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractJobDescription } from "@/lib/simulator/jd-extractor";
import { generateSimulation } from "@/lib/simulator/generator";
import { initialState } from "@/lib/simulator/engine";
import { PROMPT_VERSION, type SimulationPayload } from "@/lib/simulator/types";

export const maxDuration = 60; // seconds — generation can take up to ~30s

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id!;

  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = (body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  // 1. Extract
  const extracted = await extractJobDescription(url, PROMPT_VERSION);
  if (!extracted.ok) {
    return NextResponse.json({ error: extracted.error }, { status: 400 });
  }

  // 2. Cache lookup
  let simulation = await prisma.simulation.findUnique({
    where: { sourceHash: extracted.sourceHash },
  });

  // 3. Generate if no cache hit
  if (!simulation) {
    const gen = await generateSimulation(extracted.content, userId);
    if (!gen.ok) {
      return NextResponse.json(
        { error: `Couldn't generate the simulation: ${gen.error}` },
        { status: 502 },
      );
    }
    simulation = await prisma.simulation.create({
      data: {
        sourceHash: extracted.sourceHash,
        sourceUrl: url,
        jdSnippet: extracted.jdSnippet,
        jobTitle: gen.payload.jobTitle,
        companyName: gen.payload.companyName,
        location: gen.payload.location,
        payload: gen.payload as unknown as object,
        modelUsed: gen.modelUsed,
        generationMs: gen.generationMs,
        promptVersion: PROMPT_VERSION,
        createdById: userId,
      },
    });
  }

  // 4. Create the attempt
  const payload = simulation.payload as unknown as SimulationPayload;
  const seed = initialState(payload);
  const attempt = await prisma.simulationAttempt.create({
    data: {
      simulationId: simulation.id,
      userId,
      week: seed.week,
      scenarioIndex: seed.scenarioIndex,
      stats: seed.stats as unknown as object,
      log: [] as unknown as object,
      finished: false,
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    simulationId: simulation.id,
    jobTitle: simulation.jobTitle,
    companyName: simulation.companyName,
    cached: !!simulation.id && simulation.createdAt.getTime() < Date.now() - 5000,
  });
}
