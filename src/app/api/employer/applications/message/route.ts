/**
 * POST /api/employer/applications/message
 *
 * Sends a bulk email to a set of applicants for a specific posting.
 * Each recipient is identified by an ApplicationStatus ID so the
 * caller knows exactly which pipeline entries are being contacted.
 *
 * Body:
 *   postingId             — the posting the applications belong to
 *   applicationStatusIds  — array of ApplicationStatus.id (max 100)
 *   subject               — email subject (1–200 chars)
 *   body                  — email body text (20–10 000 chars)
 *
 * Auth:
 *   - The caller's active companyId must match posting.companyId, OR
 *   - The caller must be admin / superadmin.
 *
 * Mail behaviour:
 *   - If SMTP is configured (mailConfigured()), actually sends via sendMail.
 *   - If not configured (demo mode), skips send but still counts as "sent".
 *
 * After the send loop, logs a "bulk_email_sent" EmployerActivityLog row
 * via writeEmployerAction.
 *
 * Returns: { ok: true, sent: number, failed: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/employer/company";
import { writeEmployerAction } from "@/lib/employer/activity";
import { sendMail, mailConfigured } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id ?? null;
  const sysRole = (session.user as { role?: string }).role ?? "trainee";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Parse body ────────────────────────────────────────────────────
  const body = (await req.json().catch(() => ({}))) as {
    postingId?: string;
    applicationStatusIds?: unknown;
    subject?: string;
    body?: string;
  };

  // ── Validate input ────────────────────────────────────────────────
  if (!body.postingId) {
    return NextResponse.json({ error: "postingId is required" }, { status: 400 });
  }

  if (
    !Array.isArray(body.applicationStatusIds) ||
    body.applicationStatusIds.length === 0
  ) {
    return NextResponse.json(
      { error: "applicationStatusIds must be a non-empty array" },
      { status: 400 },
    );
  }
  if (body.applicationStatusIds.length > 100) {
    return NextResponse.json(
      { error: "applicationStatusIds must not exceed 100 entries" },
      { status: 400 },
    );
  }

  const subjectStr = (body.subject ?? "").trim();
  if (subjectStr.length < 1 || subjectStr.length > 200) {
    return NextResponse.json(
      { error: "subject must be between 1 and 200 characters" },
      { status: 400 },
    );
  }

  const bodyStr = (body.body ?? "").trim();
  if (bodyStr.length < 20 || bodyStr.length > 10_000) {
    return NextResponse.json(
      { error: "body must be between 20 and 10 000 characters" },
      { status: 400 },
    );
  }

  const applicationStatusIds = body.applicationStatusIds as string[];
  const { postingId } = body;

  // ── Authorise: posting must belong to caller's company ────────────
  const posting = await prisma.internshipPosting.findUnique({
    where:  { id: postingId },
    select: { id: true, companyId: true },
  });
  if (!posting) {
    return NextResponse.json({ error: "Posting not found" }, { status: 404 });
  }

  const isAdmin = sysRole === "admin" || sysRole === "superadmin";
  let companyId: string | null = posting.companyId ?? null;

  if (!isAdmin) {
    const callerCompanyId = await getActiveCompanyId(userId);
    if (!callerCompanyId || callerCompanyId !== posting.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    companyId = callerCompanyId;
  } else if (!companyId) {
    // Admin path: fall back to caller's active company for the activity log.
    companyId = await getActiveCompanyId(userId);
  }

  if (!companyId) {
    return NextResponse.json({ error: "Unable to resolve company" }, { status: 403 });
  }

  // ── Send loop ─────────────────────────────────────────────────────
  const useRealMail = mailConfigured();
  let sent   = 0;
  let failed = 0;

  for (const appStatusId of applicationStatusIds) {
    try {
      // Fetch the ApplicationStatus row with its applicant info.
      const appStatus = await prisma.applicationStatus.findUnique({
        where:   { id: appStatusId },
        include: {
          applicant: { select: { email: true, name: true } },
        },
      });

      // Silently skip rows that don't exist or don't belong to this posting.
      if (!appStatus || appStatus.postingId !== postingId) {
        failed++;
        continue;
      }

      const recipientEmail = appStatus.applicant?.email;
      if (!recipientEmail) {
        failed++;
        continue;
      }

      if (useRealMail) {
        await sendMail({ to: recipientEmail, subject: subjectStr, text: bodyStr });
      }
      // If mail isn't configured we count it as sent (demo mode).
      sent++;
    } catch {
      failed++;
    }
  }

  // ── Activity log ──────────────────────────────────────────────────
  await writeEmployerAction({
    kind:      "bulk_email_sent",
    companyId,
    actorId:   userId,
    postingId,
    payload: {
      count:           sent,
      subject:         subjectStr,
      recipientCount:  applicationStatusIds.length,
    },
  });

  return NextResponse.json({ ok: true, sent, failed });
}
