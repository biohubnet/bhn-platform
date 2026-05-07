import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GDPR Art. 15 / 20 — full data export. Returns a JSON document covering
 * every record we hold tied to the user. Logged in DataSubjectRequest.
 */
export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const [
    user, accounts, sessions, enrollments, certificates, transactions,
    creditApplications, roleRequests, scormSessions, assessmentAttempts,
    pathwayEnrollments, buddyPairs, buddyMessages, events,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.account.findMany({ where: { userId }, select: { id: true, type: true, provider: true } }),
    prisma.session.findMany({ where: { userId } }),
    prisma.enrollment.findMany({ where: { userId } }),
    prisma.certificate.findMany({ where: { userId } }),
    prisma.creditTransaction.findMany({ where: { userId } }),
    prisma.creditApplication.findMany({ where: { userId } }),
    prisma.roleChangeRequest.findMany({ where: { userId } }),
    prisma.scormSession.findMany({ where: { userId } }),
    prisma.assessmentAttempt.findMany({ where: { userId } }),
    prisma.pathwayEnrollment.findMany({ where: { userId } }),
    prisma.buddyPair.findMany({
      where: { OR: [{ initiatorId: userId }, { partnerId: userId }] },
    }),
    prisma.buddyMessage.findMany({ where: { senderId: userId } }),
    prisma.event.findMany({ where: { userId } }),
  ]);

  // Strip the password hash from the export — never expose
  const safeUser = user ? { ...user, password: null } : null;

  await prisma.dataSubjectRequest.create({
    data: { userId, kind: "export", status: "completed", completedAt: new Date(), detail: "Full account export" },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    user: safeUser,
    accounts,
    sessions,
    enrollments,
    certificates,
    creditTransactions: transactions,
    creditApplications,
    roleRequests,
    scormSessions,
    assessmentAttempts,
    pathwayEnrollments,
    buddyPairs,
    buddyMessages,
    events,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bhn-training-data-${userId}-${Date.now()}.json"`,
    },
  });
}
