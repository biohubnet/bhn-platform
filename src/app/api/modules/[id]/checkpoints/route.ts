/**
 * GET /api/modules/[id]/checkpoints  — trainee-facing read.
 *
 * Returns checkpoints for the module with the linked question's stem
 * + options (where applicable), but never the correctAnswer or
 * explanation. The player evaluates answers by POSTing to
 * /api/modules/[id]/checkpoints/answer (a separate handler) — keeps
 * the answer key out of the page bundle.
 *
 * Auth: any signed-in user; we don't gate on enrollment for the cheap
 * MVP, on the same logic as the mastery API.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const rows = await prisma.moduleCheckpoint.findMany({
    where: { moduleId: id },
    include: {
      question: {
        select: {
          id: true, text: true, type: true, options: true, topic: true,
        },
      },
    },
    orderBy: [{ timestampSeconds: "asc" }, { orderIndex: "asc" }],
  });
  return NextResponse.json({ checkpoints: rows });
}
