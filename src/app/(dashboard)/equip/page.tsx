/**
 * BISECTION STEP 2 of debugging /equip.
 *
 * Includes ALL the data-fetching from the original page:
 *   • session + role check
 *   • prisma.equipApplication.findMany in try/catch
 *   • totalApps / totalApproved / totalFunded calculations
 *
 * But the render is still the minimal "works ✓" card.
 *
 * If THIS loads → the data path is fine; bug is in the JSX
 *                  rendering (DS primitives, icon passing, child
 *                  components, etc.). Next step: add JSX back.
 *
 * If THIS does NOT load → bug is in the data path. Either the
 *                          session/role extraction, the prisma
 *                          query (despite the try/catch), or one
 *                          of the array operations.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  let tableMissing = false;
  let queryError: string | null = null;
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
  } catch (err) {
    const msg = (err as Error).message ?? "";
    queryError = msg;
    console.error("[equip/page step2] prisma query failed", { message: msg });
    tableMissing = /does not exist|P2021|relation/i.test(msg);
    apps = [];
  }

  const totalApps = apps.length;
  const totalApproved = apps.filter((a) => a.status === "approved" || a.status === "funded").length;
  const totalFunded = apps
    .filter((a) => a.status === "funded" || a.status === "approved")
    .reduce((sum, a) => sum + (a.approvedAmount ?? 0), 0);
  const hasDraft = apps.some((a) => a.status === "draft");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          Debug build · step 2 (data fetching)
        </p>
        <h1 className="text-2xl font-bold text-emerald-900 mt-1">
          Data path works ✓
        </h1>
        <ul className="text-xs text-emerald-800 mt-3 space-y-1 font-mono">
          <li>userId: {userId.slice(0, 8)}…</li>
          <li>role: {role}</li>
          <li>isAdmin: {String(isAdmin)}</li>
          <li>apps.length: {totalApps}</li>
          <li>totalApproved: {totalApproved}</li>
          <li>totalFunded: ${totalFunded.toLocaleString()}</li>
          <li>hasDraft: {String(hasDraft)}</li>
          <li>tableMissing: {String(tableMissing)}</li>
          {queryError && <li className="text-rose-700">queryError: {queryError}</li>}
        </ul>
        <p className="text-sm text-emerald-800 mt-4 leading-relaxed">
          If you see this card with all values filled in, the
          server-side data fetching is fine. The bug is in the
          JSX rendering of one of the design-system primitives or
          child components — next bisection adds those back.
        </p>
      </div>
    </div>
  );
}
