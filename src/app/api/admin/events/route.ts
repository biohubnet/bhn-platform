/**
 * Admin: create a new BhnEvent row.
 *
 *   POST /api/admin/events
 *     body: {
 *       slug:                 string  (required, kebab-case, unique)
 *       title:                string  (required)
 *       startDate:            string  (required, ISO)
 *       endDate:              string  (required, ISO, ≥ startDate)
 *       tagline?:             string
 *       description?:         string  (markdown)
 *       timezone?:            string  (default "America/Toronto")
 *       mainVenueName?:       string
 *       mainVenueAddress?:    string
 *       mainVenueMapUrl?:     string
 *       coverImageUrl?:       string
 *       accommodationInfo?:   string  (markdown)
 *       registrationOpensAt?: string  (ISO, optional)
 *       registrationClosesAt?:string  (ISO, optional)
 *       requiresApproval?:    boolean (default true)
 *       status?:              "draft" | "published" | "archived"  (default "draft")
 *     }
 *
 * The PATCH endpoint at /api/admin/events/[slug] handles everything
 * else — cover image, accommodation copy, status flips, registration
 * window adjustments. This POST is intentionally minimal so the New-
 * Event form stays one focused step rather than a giant wizard.
 *
 * Slug rules:
 *   • kebab-case ([a-z0-9-]+), 3–80 chars
 *   • cannot start with "demo-" (reserved for the demo seed)
 *   • must be unique platform-wide
 *
 * Status defaults to "draft" — we never publish on create. The admin
 * flips the switch after they've filled in workshops / sessions /
 * speakers via the seed file (or future CRUD UIs).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_STATUSES = ["draft", "published", "archived"] as const;
type Status = (typeof VALID_STATUSES)[number];

interface Body {
  slug?: string;
  title?: string;
  tagline?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  mainVenueName?: string;
  mainVenueAddress?: string;
  mainVenueMapUrl?: string;
  coverImageUrl?: string;
  accommodationInfo?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  requiresApproval?: boolean;
  status?: Status;
}

function parseDate(key: string, v: string | undefined): Date | undefined {
  if (v === undefined || v === "") return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${key} must be a valid ISO date`);
  }
  return d;
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Body;

  // ── Required fields ────────────────────────────────────────────
  const slug = body.slug?.trim().toLowerCase();
  const title = body.title?.trim();
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  // ── Slug validation ────────────────────────────────────────────
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug must be kebab-case (lowercase letters, numbers, single hyphens)" },
      { status: 400 },
    );
  }
  if (slug.length < 3 || slug.length > 80) {
    return NextResponse.json(
      { error: "slug must be 3–80 characters" },
      { status: 400 },
    );
  }
  if (slug.startsWith("demo-")) {
    return NextResponse.json(
      { error: "slug cannot start with 'demo-' — that prefix is reserved for the demo seed" },
      { status: 400 },
    );
  }

  // ── Date validation ────────────────────────────────────────────
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let registrationOpensAt: Date | undefined;
  let registrationClosesAt: Date | undefined;
  try {
    startDate = parseDate("startDate", body.startDate);
    endDate = parseDate("endDate", body.endDate);
    registrationOpensAt = parseDate("registrationOpensAt", body.registrationOpensAt);
    registrationClosesAt = parseDate("registrationClosesAt", body.registrationClosesAt);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!startDate) return NextResponse.json({ error: "startDate is required" }, { status: 400 });
  if (!endDate) return NextResponse.json({ error: "endDate is required" }, { status: 400 });
  if (endDate.getTime() < startDate.getTime()) {
    return NextResponse.json(
      { error: "endDate must be on or after startDate" },
      { status: 400 },
    );
  }
  if (
    registrationOpensAt &&
    registrationClosesAt &&
    registrationClosesAt.getTime() < registrationOpensAt.getTime()
  ) {
    return NextResponse.json(
      { error: "registrationClosesAt must be on or after registrationOpensAt" },
      { status: 400 },
    );
  }

  // ── Status ─────────────────────────────────────────────────────
  const status: Status =
    body.status && (VALID_STATUSES as readonly string[]).includes(body.status)
      ? body.status
      : "draft";

  // ── Uniqueness ─────────────────────────────────────────────────
  const existing = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `An event with slug "${slug}" already exists.` },
      { status: 409 },
    );
  }

  // ── Create ─────────────────────────────────────────────────────
  const created = await prisma.bhnEvent.create({
    data: {
      slug,
      title,
      tagline: body.tagline?.trim() || null,
      description: body.description?.trim() || null,
      startDate,
      endDate,
      timezone: body.timezone?.trim() || "America/Toronto",
      mainVenueName: body.mainVenueName?.trim() || null,
      mainVenueAddress: body.mainVenueAddress?.trim() || null,
      mainVenueMapUrl: body.mainVenueMapUrl?.trim() || null,
      coverImageUrl: body.coverImageUrl?.trim() || null,
      accommodationInfo: body.accommodationInfo?.trim() || null,
      registrationOpensAt: registrationOpensAt ?? null,
      registrationClosesAt: registrationClosesAt ?? null,
      requiresApproval: body.requiresApproval ?? true,
      status,
    },
  });

  return NextResponse.json({ ok: true, slug: created.slug, id: created.id }, { status: 201 });
}
