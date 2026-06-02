import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BatchPayload {
  userIds: string[];
  action: "activate" | "deactivate" | "setRole" | "grantCredits" | "addToGroup" | "delete";
  payload?: { role?: string; amount?: number; groupId?: string };
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actorId = (session.user as { id?: string }).id!;

  const body = (await req.json()) as BatchPayload;
  const { userIds, action, payload = {} } = body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "No users selected" }, { status: 400 });
  }
  if (userIds.length > 500) {
    return NextResponse.json({ error: "Batch too large (max 500)" }, { status: 400 });
  }

  let affected = 0;
  let failedCount = 0;

  switch (action) {
    case "activate":
    case "deactivate": {
      const r = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { isActive: action === "activate" },
      });
      affected = r.count;
      break;
    }
    case "setRole": {
      const role = payload.role;
      if (!role || !["trainee", "evaluating", "employer", "industrial_mentor", "instructor", "admin", "superadmin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      const r = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { role },
      });
      affected = r.count;
      break;
    }
    case "grantCredits": {
      const amount = Number(payload.amount);
      if (!Number.isFinite(amount) || amount === 0) {
        return NextResponse.json({ error: "Amount must be a non-zero number" }, { status: 400 });
      }
      // Atomic per-user: increment credits + log a CreditTransaction with new balance
      await prisma.$transaction(async (tx) => {
        for (const uid of userIds) {
          const updated = await tx.user.update({
            where: { id: uid },
            data: { credits: { increment: amount } },
            select: { credits: true },
          });
          await tx.creditTransaction.create({
            data: {
              userId: uid,
              amount: Math.abs(amount),
              type: amount > 0 ? "credit" : "debit",
              reason: "admin_grant",
              balanceAfter: updated.credits,
            },
          });
        }
      });
      affected = userIds.length;
      break;
    }
    case "addToGroup": {
      const groupId = payload.groupId;
      if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });
      // Skip duplicates via createMany skipDuplicates
      const r = await prisma.groupMembership.createMany({
        data: userIds.map((userId) => ({ groupId, userId })),
        skipDuplicates: true,
      });
      affected = r.count;
      break;
    }
    case "delete": {
      // Hard-delete, gated for safety: only NON-REAL test accounts (demo /
      // sandbox / phantom), never yourself, never a superadmin. Real users
      // stay per-row + superadmin-gated (see /api/admin/users/[id] DELETE).
      const targets = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          accountKind: { not: "real" },
          role: { not: "superadmin" },
          NOT: { id: actorId },
        },
        select: { id: true },
      });
      const ids = targets.map((t) => t.id);
      if (ids.length) {
        // Most relations cascade at the DB level, but a few use onDelete:
        // Restrict and would block the delete — the account's OWN electronic
        // signatures, event registrations, and workshop bookings. Clear those
        // first so the user delete can proceed.
        await prisma.$transaction([
          prisma.electronicSignature.deleteMany({ where: { signerId: { in: ids } } }),
          prisma.workshopBooking.deleteMany({ where: { userId: { in: ids } } }),
          prisma.registration.deleteMany({ where: { userId: { in: ids } } }),
        ]);
        try {
          const r = await prisma.user.deleteMany({ where: { id: { in: ids } } });
          affected = r.count;
        } catch {
          // A single unexpected reference shouldn't abort the whole sweep —
          // fall back to per-account deletes so the rest still go through.
          for (const uid of ids) {
            try { await prisma.user.delete({ where: { id: uid } }); affected++; }
            catch { failedCount++; }
          }
        }
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: `users.batch.${action}`,
      targetType: "user",
      detail: JSON.stringify({ count: userIds.length, affected, payload }),
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, affected, failed: failedCount });
}
