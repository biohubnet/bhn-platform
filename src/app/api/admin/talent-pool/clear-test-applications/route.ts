/**
 * Admin: clear test-account talent-application submissions.
 *
 *   POST /api/admin/talent-pool/clear-test-applications
 *     body: { accountKinds?: string[] }   default ["demo"]
 *
 * Wipes every EventFormSubmission on the talent-application form
 * whose submitter belongs to one of the named accountKinds. The
 * USERS themselves stay — demo accounts are useful for other
 * tests — but their pool applications are removed so the talent-
 * pool view is back to real candidates only.
 *
 * Phantom + showcase deliberately default OFF (admins can pass
 * them explicitly if they want). Phantoms auto-expire via the
 * daily-maintenance cron and their own "Clear all phantoms"
 * button; bundling them here would surprise admins who didn't
 * realise both controls touch the same rows.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const KNOWN_KINDS = ["real", "demo", "showcase", "phantom"] as const;
const DEFAULT_KINDS = ["demo"] as const;

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { accountKinds?: unknown };

  // Validate accountKinds — drop unknown values silently so an
  // out-of-date client doesn't accidentally widen the scope. Block
  // "real" outright; that would let an admin nuke production
  // applications through the wrong endpoint.
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

  // Resolve the talent-application form id once.
  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  if (!form) return NextResponse.json({ error: "Form not configured" }, { status: 404 });

  // Find every matching submission so we can return counts the UI
  // can show in the success flash.
  const targets = await prisma.eventFormSubmission.findMany({
    where: {
      formId: form.id,
      user: { accountKind: { in: kinds } },
    },
    select: {
      id: true,
      user: { select: { accountKind: true } },
    },
  });
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, byKind: {} });
  }

  const result = await prisma.eventFormSubmission.deleteMany({
    where: { id: { in: targets.map((t) => t.id) } },
  });

  // Per-kind tally for the success flash.
  const byKind: Record<string, number> = {};
  for (const t of targets) {
    const k = t.user?.accountKind ?? "unknown";
    byKind[k] = (byKind[k] ?? 0) + 1;
  }

  return NextResponse.json({ ok: true, deleted: result.count, byKind });
}
