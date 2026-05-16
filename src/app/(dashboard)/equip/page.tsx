/**
 * BISECTION STEP 5 of debugging /equip.
 *
 * Step 4 (DSPageHeader with title + eyebrow) broke. Step 5
 * strips it further — title only, no eyebrow.
 *
 * If THIS loads → DSEyebrow (used by DSPageHeader when eyebrow
 *                  is passed) is the culprit.
 *
 * If THIS breaks → DSPageHeader itself is broken at the root.
 *                  Will inspect the component file directly.
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
      <DSPageHeader title="Funding for your innovation" />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Debug build · step 5 (DSPageHeader title only)
        </p>
        <h2 className="text-lg font-bold text-emerald-900 mt-1">
          Title-only header renders ✓
        </h2>
        <p className="text-xs text-emerald-800 mt-2">
          If you see this, DSEyebrow was the culprit in step 4.
        </p>
      </div>
    </div>
  );
}
