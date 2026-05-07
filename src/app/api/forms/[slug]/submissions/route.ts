import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { FormField } from "@/lib/forms/types";
import { isSectionField, isChoiceField } from "@/lib/forms/types";

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

  const body = (await req.json().catch(() => ({}))) as { data?: Record<string, string> };
  const incoming = body.data ?? {};

  // Validate against schema: required fields, radio/select values must be in options.
  const fields = form.fields as unknown as FormField[];
  const cleaned: Record<string, string> = {};
  for (const f of fields) {
    if (isSectionField(f)) continue;
    const v = (incoming[f.id] ?? "").trim();
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

  await prisma.eventFormSubmission.create({
    data: {
      formId: form.id,
      data: cleaned,
      userId,
      email: userEmail,
    },
  });

  return NextResponse.json({ ok: true });
}
