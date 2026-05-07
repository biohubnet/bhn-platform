import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Persist a user's GDPR/CCPA consent on their account record. Anonymous
 * visitors fall back to localStorage on the client — there's no server
 * record for them, which is itself privacy-respectful.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return new NextResponse(null, { status: 204 });

  const body = await req.json().catch(() => ({}));
  await prisma.user.update({
    where: { id: userId },
    data: {
      consent: {
        necessary: true,
        analytics: !!body.analytics,
        marketing: !!body.marketing,
        version: String(body.version ?? "1.0"),
        acceptedAt: body.acceptedAt ?? new Date().toISOString(),
      },
    },
  });
  return NextResponse.json({ ok: true });
}
