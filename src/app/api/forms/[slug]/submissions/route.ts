import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { FormField } from "@/lib/forms/types";
import {
  isSectionField, isChoiceField, isMultiCheckboxField, isFileField,
  isConditionMet,
} from "@/lib/forms/types";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { slug } = await params;
  const form = await prisma.eventForm.findUnique({ where: { slug } });
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });
  if (!form.active) {
    return NextResponse.json({ error: "Form is not accepting submissions." }, { status: 410 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    data?: Record<string, string | string[]>;
  };
  const incoming = body.data ?? {};

  // Validate against schema. Strings get trimmed, choice values must be
  // in their option list, multicheckbox/file values must be string[].
  // Conditionally-hidden fields (showWhen rule not met) are treated
  // as not-required and their incoming values are dropped — matches
  // what the user actually saw on screen.
  const fields = form.fields as unknown as FormField[];
  const cleaned: Record<string, string | string[]> = {};
  for (const f of fields) {
    if (isSectionField(f)) continue;
    const conditionMet = isConditionMet(f.showWhen, incoming);
    const raw = incoming[f.id];

    if (!conditionMet) {
      // Field hidden — skip both validation and storage.
      continue;
    }

    if (isMultiCheckboxField(f)) {
      const arr = Array.isArray(raw) ? raw.map((s) => String(s).trim()).filter(Boolean) : [];
      if (f.required && arr.length === 0) {
        return NextResponse.json(
          { error: `Missing required field: ${f.label}` },
          { status: 400 }
        );
      }
      const bad = arr.find((v) => !f.options.includes(v));
      if (bad) {
        return NextResponse.json(
          { error: `Invalid option "${bad}" for "${f.label}".` },
          { status: 400 }
        );
      }
      if (arr.length) cleaned[f.id] = arr;
      continue;
    }

    if (isFileField(f)) {
      const v = typeof raw === "string" ? raw.trim() : "";
      if (f.required && !v) {
        return NextResponse.json(
          { error: `Missing required file: ${f.label}` },
          { status: 400 }
        );
      }
      // Accept only our own R2 URLs to prevent storing arbitrary external
      // links — clients that didn't go through /upload can't sneak in.
      if (v && !v.startsWith(process.env.R2_PUBLIC_URL ?? "")) {
        return NextResponse.json(
          { error: `Invalid upload reference for "${f.label}".` },
          { status: 400 }
        );
      }
      if (v) cleaned[f.id] = v;
      continue;
    }

    const v = typeof raw === "string" ? raw.trim() : "";
    if (f.required && !v) {
      return NextResponse.json(
        { error: `Missing required field: ${f.label}` },
        { status: 400 }
      );
    }
    if (v && isChoiceField(f) && !f.options.includes(v)) {
      return NextResponse.json(
        { error: `Invalid option for "${f.label}".` },
        { status: 400 }
      );
    }
    if (v) cleaned[f.id] = v;
  }

  const userId = (session.user as { id?: string }).id ?? null;
  const userEmail = (session.user as { email?: string }).email ?? null;

  const sub = await prisma.eventFormSubmission.create({
    data: {
      formId: form.id,
      data: cleaned,
      userId,
      email: userEmail,
    },
  });

  // For the talent-application form, extract skills from the long-form
  // pitch + status into the trainee's UserSkill profile (Phase 3).
  if (userId && form.slug === "talent-application") {
    const pitch = String(cleaned.pitch ?? "");
    const status = String(cleaned.status_goal ?? "");
    const text = [pitch, status].filter(Boolean).join("\n\n");
    if (text.length > 40) {
      import("@/lib/skills/ontology")
        .then(({ tagUser }) => tagUser(userId, text, "ai", { submissionId: sub.id, source: "talent_application" }))
        .catch(() => undefined);
    }
  }

  return NextResponse.json({ ok: true });
}
