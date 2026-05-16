/**
 * /committee/hqp — HQP committee coordination surface (stub).
 *
 * Members only — gated via requireCommitteeOrAdmin(["hqp"]). The
 * dashboard itself is intentionally lightweight at launch: this
 * page exists so the sidebar shortcut + welcome-screen badge have
 * a real destination, and so the access guard is in place when
 * the real HQP dashboards (trainee-quality reports, partner-
 * network analytics) land.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Award, ArrowRight, ClipboardList } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function HqpCommitteePage() {
  const session = await requireCommitteeOrAdmin(["hqp"]).catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <PageHeader
        title="HQP Committee"
        description="Coordination surface for the Highly Qualified Personnel committee. Trainee-quality reports + partner-network analytics land here as the committee scopes them; for now this is the membership-aware home page so the sidebar + welcome-screen badge have somewhere to land."
      />

      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Award size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-fg">You are on the HQP committee</h2>
            <p className="text-sm text-muted mt-1 max-w-prose">
              Membership grants access to this page + a welcome-screen badge identifying your role. Surfaces in
              the works: partner-network HQP counts, weekly trainee-quality digest, and a per-cohort review
              queue.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/analytics"
          className="block rounded-2xl border border-line bg-card p-5 hover:border-line-strong transition-colors surface-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">Platform analytics</p>
              <p className="text-xs text-muted mt-0.5">User growth, course completions, role distribution — the existing admin analytics dashboard.</p>
            </div>
            <ArrowRight size={16} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="block rounded-2xl border border-line bg-card p-5 hover:border-line-strong transition-colors surface-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">Trainee directory</p>
              <p className="text-xs text-muted mt-0.5">All trainees registered on the platform. Filter by institution + role. Admin-tier link.</p>
            </div>
            <ArrowRight size={16} className="text-muted shrink-0 mt-1" />
          </div>
        </Link>
      </section>

      <p className="text-[11px] text-subtle leading-snug">
        Want a different surface here? Add to the registry at <code className="font-mono text-fg">src/lib/committees/registry.ts</code> or tell an admin what you need — we can wire dedicated HQP dashboards once we know the cadence.
      </p>
    </div>
  );
}
