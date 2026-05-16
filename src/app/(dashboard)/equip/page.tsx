/**
 * BISECTION STEP 3 of debugging /equip.
 *
 * Step 1 (no data, no JSX): loaded → auth + layout fine
 * Step 2 (data only): loaded → prisma + session extraction fine
 * Step 3 (this): adds DSPageHeader with the original JSX fragment
 *                description + icon prop.
 *
 * If THIS loads → DSPageHeader is fine; next step adds DSStatGrid
 * If THIS breaks → DSPageHeader or its props (icon function, JSX
 *                  fragment, etc.) is the culprit
 */
import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DSPageHeader } from "@/components/design-system";

export const dynamic = "force-dynamic";

type AppRow = {
  id: string;
  stream: string;
  status: string;
  requestedAmount: number | null;
  approvedAmount: number | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
  fundedAt: Date | null;
  updatedAt: Date;
};

export default async function EquipLandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isAdmin = role === "admin" || role === "superadmin";

  let apps: AppRow[] = [];
  try {
    apps = await prisma.equipApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true, stream: true, status: true,
        requestedAmount: true, approvedAmount: true,
        submittedAt: true, decidedAt: true, fundedAt: true,
        updatedAt: true,
      },
    });
  } catch {
    apps = [];
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DSPageHeader
        eyebrow="Equip · BHN funding pillar"
        title="Funding for your innovation"
        icon={Rocket}
        description={
          <>
            The third BHN pillar after <strong>Engage</strong> (training) and{" "}
            <strong>Experience</strong> (placements). <strong>Equip</strong> backs
            trainee-entrepreneurs with strategic funding to move biomanufacturing
            innovations toward market readiness. Pick the stream that fits where
            you are — we&apos;ll pre-fill what we already know about you.
          </>
        }
      />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Debug build · step 3 (DSPageHeader added)
        </p>
        <h2 className="text-lg font-bold text-emerald-900 mt-1">
          Header renders ✓
        </h2>
        <p className="text-xs text-emerald-800 mt-2">
          role={role} · apps={apps.length} · isAdmin={String(isAdmin)}
        </p>
      </div>
    </div>
  );
}
