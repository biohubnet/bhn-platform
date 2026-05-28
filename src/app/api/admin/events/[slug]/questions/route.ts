/**
 * Custom registration questions — admin CRUD.
 *
 *   GET  /api/admin/events/[slug]/questions
 *     → { questions: CustomRegQuestion[] } in displayOrder
 *
 *   POST /api/admin/events/[slug]/questions
 *     body: { key, label, hint?, kind, options?, required?, displayOrder? }
 *     Creates a new question. `key` must be kebab-case and unique
 *     per event. `kind` must be one of the supported widget kinds.
 *
 * Per-question PATCH/DELETE live in `./[questionId]/route.ts`.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_KINDS = ["text", "longtext", "select", "multiselect", "checkbox"] as const;
type QKind = (typeof VALID_KINDS)[number];

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const questions = await prisma.customRegQuestion.findMany({
    where: { eventId: event.id },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json({ questions });
}

interface CreateBody {
  key?: string;
  label?: string;
  hint?: string;
  kind?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  displayOrder?: number;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const key   = body.key?.trim().toLowerCase();
  const label = body.label?.trim();
  const kind  = (body.kind ?? "text") as QKind;

  if (!key || !KEY_RE.test(key)) {
    return NextResponse.json(
      { error: "key must be kebab-case (lowercase + numbers + single hyphens)" },
      { status: 400 },
    );
  }
  if (key.length < 2 || key.length > 60) {
    return NextResponse.json(
      { error: "key must be 2–60 characters" },
      { status: 400 },
    );
  }
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (!(VALID_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${VALID_KINDS.join(", ")}` },
      { status: 400 },
    );
  }
  // select / multiselect require an options array.
  if ((kind === "select" || kind === "multiselect")) {
    if (!Array.isArray(body.options) || body.options.length === 0) {
      return NextResponse.json(
        { error: "options[] required for select / multiselect kinds" },
        { status: 400 },
      );
    }
    for (const opt of body.options) {
      if (
        typeof opt !== "object" ||
        opt === null ||
        typeof opt.value !== "string" ||
        typeof opt.label !== "string"
      ) {
        return NextResponse.json(
          { error: "Each option must be { value: string, label: string }" },
          { status: 400 },
        );
      }
    }
  }

  // Uniqueness pre-check (the DB still enforces it; this returns a
  // friendlier error before the insert).
  const dupe = await prisma.customRegQuestion.findUnique({
    where: { eventId_key: { eventId: event.id, key } },
    select: { id: true },
  });
  if (dupe) {
    return NextResponse.json(
      { error: `A question with key "${key}" already exists on this event.` },
      { status: 409 },
    );
  }

  // Default the displayOrder to the current max + 1 so the question
  // appears at the end of the list.
  let displayOrder = body.displayOrder;
  if (typeof displayOrder !== "number") {
    const last = await prisma.customRegQuestion.findFirst({
      where: { eventId: event.id },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    displayOrder = (last?.displayOrder ?? 0) + 1;
  }

  const created = await prisma.customRegQuestion.create({
    data: {
      eventId: event.id,
      key,
      label,
      hint: body.hint?.trim() || null,
      kind,
      options:
        kind === "select" || kind === "multiselect"
          ? (body.options as unknown as object)
          : undefined,
      required: body.required ?? false,
      displayOrder,
    },
  });
  return NextResponse.json({ ok: true, question: created }, { status: 201 });
}
