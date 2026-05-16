/**
 * BISECTION STEP 4 of debugging /equip.
 *
 * Step 1 (no JSX): loaded
 * Step 2 (data only): loaded
 * Step 3 (DSPageHeader w/ icon + JSX-fragment description): BROKE
 *
 * DSPageHeader's involvement confirmed. Now narrow which prop
 * triggers it. Step 4 renders DSPageHeader with title + eyebrow
 * only — no icon, no description.
 *
 * If THIS loads → bare DSPageHeader is fine; icon or description
 *                  is the cause. Step 5 will add icon back alone.
 *
 * If THIS breaks → DSPageHeader itself (or DSEyebrow it uses) is
 *                  the cause. Will inspect the component directly.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DSPageHeader } from "@/components/design-system";

export const dynamic = "force-dynamic";

export default async function EquipLandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DSPageHeader
        eyebrow="Equip · BHN funding pillar"
        title="Funding for your innovation"
      />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Debug build · step 4 (DSPageHeader bare)
        </p>
        <h2 className="text-lg font-bold text-emerald-900 mt-1">
          Bare header renders ✓
        </h2>
        <p className="text-xs text-emerald-800 mt-2">
          If you see this, DSPageHeader works without icon/description.
          Bug must be one of those two props.
        </p>
      </div>
    </div>
  );
}
