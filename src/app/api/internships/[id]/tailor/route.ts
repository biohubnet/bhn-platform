/**
 * Resume-tailoring session — single endpoint, three actions.
 *
 *   POST { action: "parse" }
 *     Reads the posting JD + parses requirements once. Idempotent —
 *     re-running overwrites the prior list (useful if the JD changed).
 *
 *   POST { action: "assess", responses: { reqId: string } }
 *     Adds a new round: stores the user's per-requirement responses,
 *     re-runs the assessor with resume + pitch + ALL accumulated
 *     responses, then runs the hiring-manager verdict. Returns the
 *     fresh round.
 *
 *   POST { action: "save", state: TailorState }
 *     Trusted save — used by the client to persist intermediate state
 *     (e.g. when the user types into a gap response and pauses). The
 *     server NEVER assesses or verdicts on a "save" call; that's
 *     reserved for "assess".
 *
 * Every action upserts a single PrepSession row keyed on (userId,
 * postingId); the tailor blob lives at PrepSession.state.tailor.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseRequirements,
  assessRequirements,
  hiringManagerVerdict,
} from "@/lib/tailor/ai";
import {
  loadTailorState,
  type Requirement,
  type Round,
  type TailorState,
} from "@/lib/tailor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: postingId } = await ctx.params;
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true, resumeUrl: true, elevatorPitch: true, bio: true,
    },
  });
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: "parse" | "assess" | "save";
    responses?: Record<string, string>;
    state?: TailorState;
  };
  const action = body.action;
  if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: { id: true, title: true, companyName: true, positionDetails: true },
  });
  if (!posting) return NextResponse.json({ error: "posting not found" }, { status: 404 });

  // Load the existing PrepSession (or seed an empty one). The tailor
  // blob lives under state.tailor — coexists with the existing 4-step
  // prep state under their own keys.
  const existing = await prisma.prepSession.findUnique({
    where: { userId_postingId: { userId: me.id, postingId } },
    select: { id: true, state: true },
  });
  const baseState = (existing?.state as Record<string, unknown> | null) ?? {};
  const tailor = loadTailorState(baseState.tailor);

  if (action === "save") {
    if (!body.state) {
      return NextResponse.json({ error: "state required for save" }, { status: 400 });
    }
    const next = { ...baseState, tailor: body.state };
    await upsertSession(me.id, postingId, next);
    return NextResponse.json({ ok: true, state: body.state });
  }

  if (action === "parse") {
    const requirements: Requirement[] = await parseRequirements(
      posting.positionDetails,
      posting.title,
      me.id,
    );
    const nextTailor: TailorState = {
      v: 1,
      requirements,
      // Wiping rounds when the JD is re-parsed is a deliberate choice:
      // the assessments depend on the old requirement ids, and we'd
      // rather not silently keep a half-stale state. The user can
      // start the assess loop fresh.
      rounds: [],
      finalised: false,
    };
    await upsertSession(me.id, postingId, { ...baseState, tailor: nextTailor });
    return NextResponse.json({ ok: true, state: nextTailor });
  }

  if (action === "assess") {
    if (tailor.requirements.length === 0) {
      return NextResponse.json(
        { error: "Parse the JD first (no requirements on file)." },
        { status: 400 },
      );
    }
    const newResponses = body.responses ?? {};

    // Materials = static profile + every round's user responses so
    // the assessor builds on accumulated context (the user shouldn't
    // have to retype prior rounds).
    const materials = buildMaterials({
      resumeUrl: me.resumeUrl,
      elevatorPitch: me.elevatorPitch,
      bio: me.bio,
      priorRounds: tailor.rounds,
      thisRoundResponses: newResponses,
    });

    const assessments = await assessRequirements(
      { requirements: tailor.requirements, applicantMaterials: materials },
      me.id,
    );
    const verdict = await hiringManagerVerdict(
      {
        postingTitle: posting.title,
        companyName: posting.companyName,
        requirements: tailor.requirements,
        assessments,
      },
      me.id,
    );

    const round: Round = {
      num: tailor.rounds.length + 1,
      assessments,
      responses: newResponses,
      verdict,
      createdAt: new Date().toISOString(),
    };
    const nextTailor: TailorState = {
      ...tailor,
      rounds: [...tailor.rounds, round],
      finalised: verdict.decision === "yes",
    };
    await upsertSession(me.id, postingId, { ...baseState, tailor: nextTailor });
    return NextResponse.json({ ok: true, state: nextTailor, round });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

// ─── Helpers ────────────────────────────────────────────────────

async function upsertSession(
  userId: string,
  postingId: string,
  state: Record<string, unknown>,
): Promise<void> {
  // Prisma's `Json` field input expects the InputJsonValue type, not
  // a plain Record. Round-trip through JSON.stringify/parse so we
  // hand it a typed-clone the client accepts.
  const json = JSON.parse(JSON.stringify(state));
  await prisma.prepSession.upsert({
    where: { userId_postingId: { userId, postingId } },
    create: { userId, postingId, state: json },
    update: { state: json },
  });
}

function buildMaterials(input: {
  resumeUrl: string | null;
  elevatorPitch: string | null;
  bio: string | null;
  priorRounds: Round[];
  thisRoundResponses: Record<string, string>;
}): string {
  const lines: string[] = [];
  if (input.bio) {
    lines.push("### Bio");
    lines.push(input.bio);
    lines.push("");
  }
  if (input.elevatorPitch) {
    lines.push("### Elevator pitch");
    lines.push(input.elevatorPitch);
    lines.push("");
  }
  if (input.resumeUrl) {
    lines.push("### Resume on file");
    lines.push(`(URL: ${input.resumeUrl} — text not extracted here; trust the bio + pitch + user responses for evidence.)`);
    lines.push("");
  }
  // Replay all prior responses, then layer this round's on top —
  // later answers supersede earlier ones for the same requirement.
  const merged: Record<string, string> = {};
  for (const r of input.priorRounds) {
    for (const [reqId, text] of Object.entries(r.responses ?? {})) {
      if (text && text.trim()) merged[reqId] = text.trim();
    }
  }
  for (const [reqId, text] of Object.entries(input.thisRoundResponses)) {
    if (text && text.trim()) merged[reqId] = text.trim();
  }
  if (Object.keys(merged).length > 0) {
    lines.push("### User-provided context (organised by requirement id)");
    for (const [reqId, text] of Object.entries(merged)) {
      lines.push(`- (${reqId}) ${text}`);
    }
    lines.push("");
  }
  if (lines.length === 0) {
    lines.push("(The applicant hasn't supplied any materials yet.)");
  }
  return lines.join("\n");
}
