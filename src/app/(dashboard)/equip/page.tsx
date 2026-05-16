/**
 * BISECTION STEP 10 of debugging /equip.
 *
 * Step 7 (DSPageHeader title only):           ✓ loaded
 * Step 9 (DSPageHeader + icon + description): ✗ broke
 *
 * Step 10 tests: does adding ONLY the icon prop break it, or
 * does it need the description JSX fragment too?
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
        title="Funding for your innovation"
        icon={Rocket}
      />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Debug build · step 10 (title + icon, no description)
        </p>
        <h2 className="text-lg font-bold text-emerald-900 mt-1">
          Icon-only header renders ✓
        </h2>
        <p className="text-xs text-emerald-800 mt-2">
          If you see this, the icon prop is fine. Then the bug
          is in the description (JSX fragment with strong tags).
        </p>
      </div>
    </div>
  );
}
