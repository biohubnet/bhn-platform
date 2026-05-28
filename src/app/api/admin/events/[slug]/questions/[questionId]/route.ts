/**
 * Custom registration question — per-row PATCH + DELETE.
 *
 *   PATCH  /api/admin/events/[slug]/questions/[questionId]
 *     Partial update. `kind` swaps allowed but you can't change the
 *     event the question belongs to. Editing `key` is allowed — the
 *     unique constraint still holds.
 *
 *   DELETE /api/admin/events/[slug]/questions/[questionId]
 *     Cascades to CustomRegAnswer rows for this question (per
 *     foreign-key onDelete: Cascade). Answers from existing
 *     registrations are lost when a question is deleted, so the
 *     admin UI confirms first.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_KINDS = ["text", "longtext", "select", "multiselect", "checkbox"] as const;
type QKind = (typeof VALID_KINDS)[number];
const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface PatchBody {
  key?: string;
  label?: string;
  hint?: string | null;
  kind?: string;
  options?: Array<{ value: string; label: string }> | null;
  required?: boolean;
  displayOrder?: number;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; questionId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, questionId } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const question = await prisma.customRegQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, eventId: true, kind: true },
  });
  if (!question || question.eventId !== event.id) {
    return NextResponse.json({ error: "Question not found for this event" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const data: Record<string, unknown> = {};

  if (body.key !== undefined) {
    const k = body.key.trim().toLowerCase();
    if (!KEY_RE.test(k) || k.length < 2 || k.length > 60) {
      return NextResponse.json(
        { error: "key must be 2–60 chars kebab-case" },
        { status: 400 },
      );
    }
    data.key = k;
  }
  if (body.label !== undefined) {
    const l = body.label.trim();
    if (!l) return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
    data.label = l;
  }
  if (body.hint !== undefined) data.hint = body.hint?.trim() || null;
  if (body.kind !== undefined) {
    if (!(VALID_KINDS as readonly string[]).includes(body.kind)) {
      return NextResponse.json(
        { error: `kind must be one of: ${VALID_KINDS.join(", ")}` },
        { status: 400 },
      );
    }
    data.kind = body.kind as QKind;
  }
  if (body.options !== undefined) {
    if (body.options === null) {
      data.options = null;
    } else {
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
      data.options = body.options as unknown as object;
    }
  }
  if (body.required !== undefined) data.required = body.required;
  if (body.displayOrder !== undefined) data.displayOrder = body.displayOrder;

  try {
    const updated = await prisma.customRegQuestion.update({
      where: { id: questionId },
      data,
    });
    return NextResponse.json({ ok: true, question: updated });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A question with that key already exists on this event." },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; questionId: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, questionId } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const question = await prisma.customRegQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, eventId: true },
  });
  if (!question || question.eventId !== event.id) {
    return NextResponse.json({ error: "Question not found for this event" }, { status: 404 });
  }

  // Cascade-deletes the answers (per @relation onDelete: Cascade).
  await prisma.customRegQuestion.delete({ where: { id: questionId } });
  return NextResponse.json({ ok: true });
}
