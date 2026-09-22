/**
 * /admin/dashboard-promos — manage the "What's on" band at the top of
 * everyone's home page: events, workshops and announcements.
 *
 * Admin-only tooling, so English-only.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardPromosAdmin, type AdminPromo } from "@/components/admin/DashboardPromosAdmin";
import { dayString, groupPromos, isPromoCurrent, torontoToday } from "@/lib/dashboard-promos";

export const dynamic = "force-dynamic";

export default async function DashboardPromosAdminPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const rows = await prisma.dashboardPromo.findMany({
    orderBy: [{ displayOrder: "asc" }, { startDate: "asc" }, { createdAt: "desc" }],
  });
  const today = torontoToday();
  // The same selection the home page makes, so "Showing" is exact.
  const showing = new Set(
    groupPromos(rows.filter((r) => r.status === "published"), today).flatMap((g) => g.items.map((i) => i.id)),
  );

  const promos: AdminPromo[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    summary: r.summary,
    startDate: dayString(r.startDate),
    endDate: dayString(r.endDate),
    location: r.location,
    ctaLabel: r.ctaLabel,
    ctaHref: r.ctaHref,
    showUntil: dayString(r.showUntil),
    status: r.status === "published" ? "published" : "draft",
    displayOrder: r.displayOrder,
    state:
      r.status !== "published" ? "draft"
      : showing.has(r.id) ? "showing"
      : isPromoCurrent(r, today) ? "queued"
      : "ended",
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard promos"
        description="The events, workshops and announcements in the “What's on” band, right under the banner on everyone's home page. Up to three of each kind show at once, lowest order number first. Dated cards drop off after their last day."
        actions={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-fg hover:border-brand-300"
          >
            View home page
          </Link>
        }
      />
      <DashboardPromosAdmin promos={promos} />
    </div>
  );
}
