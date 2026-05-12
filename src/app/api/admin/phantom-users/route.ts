/**
 * Admin: spawn phantom users.
 *
 *   POST /api/admin/phantom-users
 *     body: { count: number, role?: "trainee" | "evaluating" | "employer" | "instructor", hours?: number }
 *
 *   GET  /api/admin/phantom-users
 *     Returns every currently-alive phantom (accountKind="phantom"
 *     AND demoExpiresAt > NOW()). Used by the admin page.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  spawnPhantoms,
  PHANTOM_TTL_DEFAULT_HOURS,
  PHANTOM_TTL_MAX_HOURS,
  PHANTOM_BATCH_MAX,
  PHANTOM_ROLE_VALUES,
} from "@/lib/phantom";

/** Demo scenario types the spawn endpoint can apply after creation.
 *  Each scenario seeds a small amount of state on the new phantom so
 *  admin demos start at the interesting moment (pending course
 *  enrolment, pending pathway request, etc.) instead of "blank user". */
const DEMO_SCENARIOS = [
  "course_enrollment_request",
  "pathway_enrollment_request",
] as const;
type DemoScenarioKind = (typeof DEMO_SCENARIOS)[number];

export const runtime = "nodejs";

export async function GET() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const phantoms = await prisma.user.findMany({
    where: {
      accountKind: "phantom",
      demoExpiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      credits: true,
      magicToken: true,
      organization: true,
      jobTitle: true,
      demoExpiresAt: true,
      createdAt: true,
      createdByAdmin: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, phantoms });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminId = (session.user as { id?: string }).id ?? null;
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    count?: unknown;
    role?: unknown;
    hours?: unknown;
    /** Optional demo scenario applied to every spawned phantom.
     *  See DEMO_SCENARIOS above for valid values; targetId points to
     *  the Course or Pathway depending on the scenario kind. */
    scenario?: {
      kind?: unknown;
      targetId?: unknown;
    };
  };

  if (typeof body.count !== "number" || !Number.isInteger(body.count) || body.count < 1) {
    return NextResponse.json({ error: "count must be a positive integer" }, { status: 400 });
  }
  if (body.count > PHANTOM_BATCH_MAX) {
    return NextResponse.json(
      { error: `count must be ≤ ${PHANTOM_BATCH_MAX} (spawn in batches)` },
      { status: 400 },
    );
  }
  if (body.role !== undefined && !(PHANTOM_ROLE_VALUES as readonly string[]).includes(String(body.role))) {
    return NextResponse.json(
      { error: `role must be one of: ${PHANTOM_ROLE_VALUES.join(", ")}` },
      { status: 400 },
    );
  }
  if (body.hours !== undefined) {
    if (typeof body.hours !== "number" || body.hours < 1 || body.hours > PHANTOM_TTL_MAX_HOURS) {
      return NextResponse.json(
        { error: `hours must be between 1 and ${PHANTOM_TTL_MAX_HOURS}` },
        { status: 400 },
      );
    }
  }

  // Scenario validation (optional). We pre-flight the target id
  // here so the spawn doesn't half-succeed (users created but
  // scenario-attach fails). Pathway and course are both required to
  // exist on this row.
  let scenarioKind: DemoScenarioKind | null = null;
  let scenarioTargetId: string | null = null;
  if (body.scenario && typeof body.scenario === "object") {
    if (!(DEMO_SCENARIOS as readonly string[]).includes(String(body.scenario.kind))) {
      return NextResponse.json(
        { error: `scenario.kind must be one of: ${DEMO_SCENARIOS.join(", ")}` },
        { status: 400 },
      );
    }
    if (typeof body.scenario.targetId !== "string" || !body.scenario.targetId) {
      return NextResponse.json({ error: "scenario.targetId required" }, { status: 400 });
    }
    scenarioKind = body.scenario.kind as DemoScenarioKind;
    scenarioTargetId = body.scenario.targetId;

    // Verify the target exists so the failure path is the cleanest 404.
    if (scenarioKind === "course_enrollment_request") {
      const ok = await prisma.course.findUnique({
        where: { id: scenarioTargetId },
        select: { id: true },
      });
      if (!ok) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    } else if (scenarioKind === "pathway_enrollment_request") {
      const ok = await prisma.pathway.findUnique({
        where: { id: scenarioTargetId },
        select: { id: true },
      });
      if (!ok) return NextResponse.json({ error: "Pathway not found" }, { status: 404 });
    }
  }

  try {
    const phantoms = await spawnPhantoms({
      count: body.count,
      role: (body.role as "trainee" | "evaluating" | "employer" | "instructor") ?? "trainee",
      hours: (body.hours as number) ?? PHANTOM_TTL_DEFAULT_HOURS,
      adminId,
    });

    // Apply scenario, one row per phantom. We do this in a single
    // createMany to keep it cheap; createMany skips duplicates by
    // default but the phantom userIds are fresh so collisions
    // shouldn't happen.
    if (scenarioKind === "course_enrollment_request" && scenarioTargetId) {
      await prisma.enrollment.createMany({
        data: phantoms.map((p) => ({
          userId: p.id,
          courseId: scenarioTargetId!,
          status: "pending",
        })),
        skipDuplicates: true,
      });
    } else if (scenarioKind === "pathway_enrollment_request" && scenarioTargetId) {
      await prisma.pathwayEnrollment.createMany({
        data: phantoms.map((p) => ({
          userId: p.id,
          pathwayId: scenarioTargetId!,
          status: "pending",
          requestReason: "Demo phantom — admin-spawned for testing",
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      ok: true,
      phantoms,
      scenario: scenarioKind
        ? { kind: scenarioKind, targetId: scenarioTargetId, attachedTo: phantoms.length }
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
