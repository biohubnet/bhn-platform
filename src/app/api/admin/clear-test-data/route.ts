/**
 * Admin: clear test-account rows for a specific entity, in bulk.
 *
 *   POST /api/admin/clear-test-data
 *     body: {
 *       entity: "internship_posting"
 *             | "form_submission"
 *             | "credit_application"
 *             | "pool_exit_feedback"
 *             | "event_registration",
 *       scope?: { formSlug?: string, eventSlug?: string },
 *       accountKinds?: string[]   default ["demo"]
 *     }
 *
 * One endpoint, switch-by-entity, so any admin surface that wants
 * a "Clear demo" affordance can call the same path with
 * a different `entity` and (when needed) a `scope`.
 *
 * Defence-in-depth
 *   • accountKinds are filtered against a whitelist. "real" is
 *     explicitly stripped even if a malicious caller passes it.
 *   • Each entity validates its own required scope (e.g.
 *     form_submission requires scope.formSlug). Missing → 400.
 *   • The USERS that own the deleted rows are never deleted by
 *     this endpoint — demo + showcase accounts are
 *     reusable across testing rounds. Phantom accounts have their
 *     own lifecycle controls and are excluded by default.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// "sandbox" is intentionally absent — the sandbox account feature
// was retired in favour of /admin/split-view, and the
// 20260513100000_drop_sandbox_kind migration converted any leftover
// rows to "demo". Listing it would let a stale UI pass it through
// and quietly hit zero rows; better to reject early.
const KNOWN_KINDS = ["real", "demo", "showcase", "phantom"] as const;
const DEFAULT_KINDS = ["demo"] as const;
const VALID_ENTITIES = [
  "internship_posting",
  "form_submission",
  "credit_application",
  "pool_exit_feedback",
  "event_registration",
  // Self-scoped — the matching demo-seed pass writes these to the
  // calling admin's own user id with a [demo] marker baked in.
  // Clear targets that marker so it can't reach real rows on the
  // same user (real ApplicationStatus / Interview rows from the
  // employer don't carry the [demo] prefix).
  "user_application_status",
  "user_skill",
  "user_interview",
  "user_star_story",
  "user_buddy_pair",
  "user_matches",
] as const;
type Entity = (typeof VALID_ENTITIES)[number];

function isEntity(s: unknown): s is Entity {
  return typeof s === "string" && (VALID_ENTITIES as readonly string[]).includes(s);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    entity?: unknown;
    scope?: { formSlug?: unknown; eventSlug?: unknown };
    accountKinds?: unknown;
  };

  if (!isEntity(body.entity)) {
    return NextResponse.json(
      { error: `entity must be one of: ${VALID_ENTITIES.join(", ")}` },
      { status: 400 },
    );
  }
  const entity = body.entity;

  // accountKinds whitelist — "real" always blocked.
  let kinds: string[];
  if (Array.isArray(body.accountKinds) && body.accountKinds.length > 0) {
    kinds = body.accountKinds
      .filter((k): k is string => typeof k === "string")
      .filter((k) => (KNOWN_KINDS as readonly string[]).includes(k))
      .filter((k) => k !== "real");
  } else {
    kinds = [...DEFAULT_KINDS];
  }
  if (kinds.length === 0) {
    return NextResponse.json(
      { error: "No valid (non-real) accountKinds provided." },
      { status: 400 },
    );
  }

  const formSlug = typeof body.scope?.formSlug === "string" ? body.scope.formSlug : null;
  const eventSlug = typeof body.scope?.eventSlug === "string" ? body.scope.eventSlug : null;

  // Per-entity handlers. Each returns { deleted, byKind } so the UI
  // can show a precise tally.
  let deleted = 0;
  const byKind: Record<string, number> = {};

  if (entity === "internship_posting") {
    // InternshipPosting has no Prisma `createdBy` relation declared
    // (legacy scalar FK only), so we can't filter via relation
    // syntax. Two-step join: pull the test-account user IDs first,
    // then delete postings whose createdById is in that set.
    const testUsers = await prisma.user.findMany({
      where: { accountKind: { in: kinds } },
      select: { id: true, accountKind: true },
    });
    if (testUsers.length > 0) {
      const userKindById = new Map(testUsers.map((u) => [u.id, u.accountKind]));
      const targets = await prisma.internshipPosting.findMany({
        where: { createdById: { in: testUsers.map((u) => u.id) } },
        select: { id: true, createdById: true },
      });
      if (targets.length > 0) {
        const r = await prisma.internshipPosting.deleteMany({
          where: { id: { in: targets.map((t) => t.id) } },
        });
        deleted = r.count;
        for (const t of targets) {
          const k = userKindById.get(t.createdById ?? "") ?? "unknown";
          byKind[k] = (byKind[k] ?? 0) + 1;
        }
      }
    }
  } else if (entity === "form_submission") {
    if (!formSlug) {
      return NextResponse.json(
        { error: "scope.formSlug required for entity=form_submission" },
        { status: 400 },
      );
    }
    const form = await prisma.eventForm.findUnique({
      where: { slug: formSlug },
      select: { id: true },
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const targets = await prisma.eventFormSubmission.findMany({
      where: { formId: form.id, user: { accountKind: { in: kinds } } },
      select: { id: true, user: { select: { accountKind: true } } },
    });
    if (targets.length > 0) {
      const r = await prisma.eventFormSubmission.deleteMany({
        where: { id: { in: targets.map((t) => t.id) } },
      });
      deleted = r.count;
      for (const t of targets) {
        const k = t.user?.accountKind ?? "unknown";
        byKind[k] = (byKind[k] ?? 0) + 1;
      }
    }
  } else if (entity === "credit_application") {
    const targets = await prisma.creditApplication.findMany({
      where: { user: { accountKind: { in: kinds } } },
      select: { id: true, user: { select: { accountKind: true } } },
    });
    if (targets.length > 0) {
      const r = await prisma.creditApplication.deleteMany({
        where: { id: { in: targets.map((t) => t.id) } },
      });
      deleted = r.count;
      for (const t of targets) {
        const k = t.user?.accountKind ?? "unknown";
        byKind[k] = (byKind[k] ?? 0) + 1;
      }
    }
  } else if (entity === "pool_exit_feedback") {
    const targets = await prisma.poolExitFeedback.findMany({
      where: { user: { accountKind: { in: kinds } } },
      select: { id: true, user: { select: { accountKind: true } } },
    });
    if (targets.length > 0) {
      const r = await prisma.poolExitFeedback.deleteMany({
        where: { id: { in: targets.map((t) => t.id) } },
      });
      deleted = r.count;
      for (const t of targets) {
        const k = t.user?.accountKind ?? "unknown";
        byKind[k] = (byKind[k] ?? 0) + 1;
      }
    }
  } else if (entity === "event_registration") {
    if (!eventSlug) {
      return NextResponse.json(
        { error: "scope.eventSlug required for entity=event_registration" },
        { status: 400 },
      );
    }
    const event = await prisma.bhnEvent.findUnique({
      where: { slug: eventSlug },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const targets = await prisma.registration.findMany({
      where: { eventId: event.id, user: { accountKind: { in: kinds } } },
      select: { id: true, user: { select: { accountKind: true } } },
    });
    if (targets.length > 0) {
      const r = await prisma.registration.deleteMany({
        where: { id: { in: targets.map((t) => t.id) } },
      });
      deleted = r.count;
      for (const t of targets) {
        const k = t.user?.accountKind ?? "unknown";
        byKind[k] = (byKind[k] ?? 0) + 1;
      }
    }
  } else if (entity === "user_application_status") {
    // Scoped to the calling admin's own rows. Marker is the
    // [demo] prefix on `notes`, baked in at seed time so we can't
    // hit a real employer-managed status row by accident.
    const meId = (session.user as { id?: string }).id;
    if (meId) {
      const targets = await prisma.applicationStatus.findMany({
        where: { applicantId: meId, notes: { startsWith: "[demo]" } },
        select: { id: true },
      });
      if (targets.length > 0) {
        const r = await prisma.applicationStatus.deleteMany({
          where: { id: { in: targets.map((t) => t.id) } },
        });
        deleted = r.count;
        byKind["self-demo"] = r.count;
      }
    }
  } else if (entity === "user_skill") {
    // Self-scoped, marker is source="demo". Only the calling
    // admin's demo-seeded skill rows are removed — real skill
    // rows (source ∈ {self, resume, ai, inferred, admin}) stay.
    const meId = (session.user as { id?: string }).id;
    if (meId) {
      const r = await prisma.userSkill.deleteMany({
        where: { userId: meId, source: "demo" },
      });
      deleted = r.count;
      if (r.count > 0) byKind["self-demo"] = r.count;
    }
  } else if (entity === "user_interview") {
    const meId = (session.user as { id?: string }).id;
    if (meId) {
      const targets = await prisma.interview.findMany({
        where: { applicantId: meId, notes: { startsWith: "[demo]" } },
        select: { id: true },
      });
      if (targets.length > 0) {
        const r = await prisma.interview.deleteMany({
          where: { id: { in: targets.map((t) => t.id) } },
        });
        deleted = r.count;
        byKind["self-demo"] = r.count;
      }
    }
  } else if (entity === "user_star_story") {
    // Self-scoped, marker is [demo] prefix on the title.
    const meId = (session.user as { id?: string }).id;
    if (meId) {
      const r = await prisma.starStory.deleteMany({
        where: { userId: meId, title: { startsWith: "[demo]" } },
      });
      deleted = r.count;
      if (r.count > 0) byKind["self-demo"] = r.count;
    }
  } else if (entity === "user_buddy_pair") {
    // Pairs the calling admin is either side of, where the goalNote
    // carries the [demo] marker (matches the seed convention).
    const meId = (session.user as { id?: string }).id;
    if (meId) {
      const r = await prisma.buddyPair.deleteMany({
        where: {
          OR: [{ initiatorId: meId }, { partnerId: meId }],
          goalNote: { startsWith: "[demo]" },
        },
      });
      deleted = r.count;
      if (r.count > 0) byKind["self-demo"] = r.count;
    }
  } else if (entity === "user_matches") {
    // Matches scenario deposited UserSkill rows (source="demo") and
    // PostingSkill rows on demo-employer-owned postings. Both are
    // cleaned to fully revert the scenario.
    const meId = (session.user as { id?: string }).id;
    if (meId) {
      const r1 = await prisma.userSkill.deleteMany({
        where: { userId: meId, source: "demo" },
      });
      const demoEmployers = await prisma.user.findMany({
        where: { accountKind: "demo", role: "employer" },
        select: { id: true },
      });
      const demoPostings = await prisma.internshipPosting.findMany({
        where: { createdById: { in: demoEmployers.map((u) => u.id) } },
        select: { id: true },
      });
      const r2 = await prisma.postingSkill.deleteMany({
        where: { postingId: { in: demoPostings.map((p) => p.id) } },
      });
      deleted = r1.count + r2.count;
      if (r1.count > 0) byKind["self-demo-skills"] = r1.count;
      if (r2.count > 0) byKind["demo-posting-skills"] = r2.count;
    }
  }

  return NextResponse.json({ ok: true, deleted, byKind });
}
