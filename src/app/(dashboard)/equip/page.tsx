/**
 * TEMPORARY MINIMAL DEBUG VERSION of /equip.
 *
 * Real page backed up at page.tsx.backup. We're trying to isolate
 * which layer (auth / prisma / design-system primitives / JSX) is
 * throwing the 500 error with digest 1621801304. This version
 * strips everything except the session check and a static render.
 *
 * If THIS loads:
 *   → the bug is in the original page's code (DS primitives,
 *     prisma query, or the specific JSX shape). Restore from
 *     backup, then bisect by adding features back one by one.
 *
 * If THIS does NOT load:
 *   → the bug is upstream (the (dashboard) layout, auth helpers,
 *     or the design-system context). Need to dig into those.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EquipLandingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Debug build
        </p>
        <h1 className="text-2xl font-bold text-emerald-900 mt-1">
          Equip page renders ✓
        </h1>
        <p className="text-sm text-emerald-800 mt-3 leading-relaxed">
          You are seeing this because the minimal version of <code className="font-mono bg-emerald-100 px-1 rounded">/equip/page.tsx</code> loaded
          successfully. That means the auth check, the
          (dashboard) layout, the design-system provider, and the
          route registration all work fine. The bug is somewhere
          in the page&apos;s original code — Prisma query, JSX
          render of one of the DS primitives, or icon imports.
        </p>
        <p className="text-sm text-emerald-800 mt-3">
          Next step: restore the original page from{" "}
          <code className="font-mono bg-emerald-100 px-1 rounded">page.tsx.backup</code>{" "}
          and bisect by removing chunks one at a time.
        </p>
      </div>
    </div>
  );
}
