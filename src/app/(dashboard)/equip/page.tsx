/**
 * BISECTION STEP 7 of debugging /equip.
 *
 * Step 6 (DSPageHeader with hardcoded designSystem, skipping
 * useContext): loaded successfully. The user saw the title-only
 * header render.
 *
 * Step 7 hypothesis: the barrel re-export at
 * `@/components/design-system/index.ts` may be breaking the
 * "use client" boundary under Next.js 16 + Turbopack, causing
 * DSPageHeader to run as a server component (where useContext
 * doesn't read provider values the same way).
 *
 * DSPageHeader has been restored to use useDesignSystem() normally.
 * This page now imports DSPageHeader DIRECTLY from its source
 * file, bypassing the barrel.
 *
 * If THIS loads → the barrel was breaking the client boundary.
 *                  Will update all consumers to import directly,
 *                  or restructure the barrel to preserve the
 *                  "use client" directive.
 *
 * If THIS breaks → barrel isn't the issue. Will try another fix.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";

export const dynamic = "force-dynamic";

export default async function EquipLandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DSPageHeader title="Funding for your innovation" />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Debug build · step 7 (direct import, hook restored)
        </p>
        <h2 className="text-lg font-bold text-emerald-900 mt-1">
          Direct-import header renders ✓
        </h2>
        <p className="text-xs text-emerald-800 mt-2">
          If you see this, importing DSPageHeader directly from
          its file (not through the barrel) fixed the issue. The
          barrel was breaking the &quot;use client&quot; boundary.
        </p>
      </div>
    </div>
  );
}
