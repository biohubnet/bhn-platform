/**
 * BISECTION STEP 9 of debugging /equip.
 *
 * Step 7 (direct import of DSPageHeader, title only): worked.
 * Step 8 (full original page, direct imports): broke.
 *
 * Step 9 tests: does DSPageHeader with FULL PROPS (icon +
 * JSX-fragment description) work via direct import? Or does
 * one of those specific props break it?
 *
 * If THIS loads → bug is in DSSection / DSStatGrid / DSStat
 *                  or in the complex JSX surrounding them.
 * If THIS breaks → bug is in DSPageHeader's icon prop or the
 *                  JSX-fragment description prop.
 */
import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";
import { getSession } from "@/lib/auth";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";

export const dynamic = "force-dynamic";

export default async function EquipLandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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
          Debug build · step 9 (DSPageHeader full props, direct import)
        </p>
        <h2 className="text-lg font-bold text-emerald-900 mt-1">
          Full-props header renders ✓
        </h2>
        <p className="text-xs text-emerald-800 mt-2">
          If you see this, DSPageHeader is fully fine via direct
          import. The bug is in DSSection, DSStatGrid, DSStat, or
          the complex JSX surrounding them.
        </p>
      </div>
    </div>
  );
}
