import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOUR_VERSION } from "@/lib/onboarding/tours";

interface OnboardingState {
  version: string;
  seenStepIds: string[];
  minimized: boolean;
  dismissed: boolean;
  completedAt: string | null;
  startedAt?: string;
}

const DEFAULT: OnboardingState = {
  version: TOUR_VERSION,
  seenStepIds: [],
  minimized: false,
  dismissed: false,
  completedAt: null,
};

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { onboarding: true } });
  const state = (u?.onboarding as unknown as OnboardingState | null) ?? DEFAULT;
  return NextResponse.json({ ...DEFAULT, ...state, currentVersion: TOUR_VERSION });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const body = await req.json();

  const current = await prisma.user.findUnique({ where: { id: userId }, select: { onboarding: true } });
  const cur = (current?.onboarding as unknown as OnboardingState | null) ?? DEFAULT;

  const next: OnboardingState = {
    ...cur,
    ...(body.version !== undefined ? { version: String(body.version) } : {}),
    ...(Array.isArray(body.seenStepIds) ? { seenStepIds: body.seenStepIds.slice(0, 200) } : {}),
    ...(body.minimized !== undefined ? { minimized: !!body.minimized } : {}),
    ...(body.dismissed !== undefined ? { dismissed: !!body.dismissed } : {}),
    ...(body.completedAt !== undefined ? { completedAt: body.completedAt } : {}),
    ...(!cur.startedAt ? { startedAt: new Date().toISOString() } : {}),
  };
  await prisma.user.update({
    where: { id: userId },
    data: { onboarding: next as unknown as object },
  });
  return NextResponse.json(next);
}
