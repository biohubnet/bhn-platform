import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GDPR Art. 17 — right to erasure. Soft-deactivates and anonymizes the
 * account immediately; full hard-deletion runs in a background job within
 * 30 days. We keep the audit trail (anonymized) for regulatory purposes.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const body = await req.json().catch(() => ({}));
  const confirm = body.confirm;
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }

  // Anonymize identifying fields, deactivate the account.
  const stamp = `deleted-${Date.now()}`;
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `${stamp}@deleted.local`,
      name: null,
      password: null,
      phone: null,
      bio: null,
      organization: null,
      jobTitle: null,
      country: null,
      isActive: false,
      newsletterSubscribed: false,
    },
  });

  await prisma.dataSubjectRequest.create({
    data: { userId, kind: "delete", status: "completed", completedAt: new Date(), detail: "Self-service account deletion + anonymization" },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "user.self_delete",
      targetType: "user",
      targetId: userId,
      detail: JSON.stringify({ deletedAt: new Date().toISOString() }),
    },
  });

  return NextResponse.json({ ok: true });
}
