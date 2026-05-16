/**
 * Applicant endpoints for HQP committee membership.
 *
 *   GET  /api/committee/hqp/applications   → my draft + window
 *   POST /api/committee/hqp/applications   → save draft / submit
 *                                            action=save: PATCH-style
 *                                            action=submit: final submit (status=submitted)
 *
 * Window gating: a new application can only be created when the
 * current window is open. Drafts continue editing until the
 * window closes; after that the row freezes.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentOpenWindow, isOpenForSubmissions } from "@/lib/hqp/windows";
import {
  validateApplication,
  type HqpApplicationFormData,
} from "@/lib/hqp/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const window = await currentOpenWindow();
  const application = window
    ? await prisma.hqpMemberApplication.findUnique({
        where: { userId_windowId: { userId, windowId: window.id } },
      })
    : null;

  // Also surface history so the applicant sees prior decisions.
  const history = await prisma.hqpMemberApplication.findMany({
    where: { userId, status: { in: ["submitted", "approved", "rejected"] } },
    include: { window: { select: { year: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ window, application, history });
}

export async function POST(req: Request) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = typeof body.action === "string" ? body.action : "save";
  const formData = (body.formData ?? {}) as HqpApplicationFormData;

  const window = await currentOpenWindow();
  if (!window || !isOpenForSubmissions(window)) {
    return NextResponse.json({ error: "There's no open HQP application window right now." }, { status: 400 });
  }

  // Upsert pattern — one row per (user, window) by virtue of the
  // unique constraint. On submit we additionally bump status +
  // submittedAt; on save we just shallow-merge formData.
  const existing = await prisma.hqpMemberApplication.findUnique({
    where: { userId_windowId: { userId, windowId: window.id } },
  });

  if (action === "submit") {
    const errors = validateApplication(formData);
    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }
    const created = existing
      ? await prisma.hqpMemberApplication.update({
          where: { id: existing.id },
          data: { formData: formData as unknown as object, status: "submitted", submittedAt: new Date() },
        })
      : await prisma.hqpMemberApplication.create({
          data: { userId, windowId: window.id, formData: formData as unknown as object, status: "submitted", submittedAt: new Date() },
        });
    return NextResponse.json({ ok: true, application: created });
  }

  // Save (draft)
  const saved = existing
    ? await prisma.hqpMemberApplication.update({
        where: { id: existing.id },
        data: { formData: { ...(existing.formData as Record<string, unknown>), ...formData } as unknown as object },
      })
    : await prisma.hqpMemberApplication.create({
        data: { userId, windowId: window.id, formData: formData as unknown as object, status: "draft" },
      });
  return NextResponse.json({ ok: true, application: saved });
}
