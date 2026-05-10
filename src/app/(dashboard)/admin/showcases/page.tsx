import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getShowcase } from "@/lib/showcase/seed";
import { ShowcasePanel } from "@/components/admin/ShowcasePanel";
import { Sparkles } from "lucide-react";

/**
 * /admin/showcases — manage the single global Showcase Trainee demo
 * account. Different concept from sandbox accounts (one per admin)
 * and demo workspaces (time-limited prospect trials):
 *
 *   • One global account at showcase.trainee@biohubnet.test.
 *   • Fully populated with the advanced-trainee state — completed
 *     courses, finished pathway, certificates, both merch rewards,
 *     full job profile, scheduled interviews.
 *   • Used for sales calls and training-team demos. Admins sign in
 *     via the magic link (or use 'View as trainee' as superadmin
 *     to peek without leaving their own session).
 *   • Refreshable. Reset wipes the related rows and re-seeds for a
 *     known-good demo state.
 */
export default async function ShowcasesPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const summary = await getShowcase();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Admin · Experience</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Sparkles size={22} className="text-brand-600" />
          Showcase Trainee
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl leading-snug">
          A single global trainee account that's already lived through
          the full BHN journey — completed courses, finished pathway,
          earned certificates, hit both merch tiers, has a full
          application profile (resume / 1-min video / elevator pitch),
          and has interviews scheduled. Use it for sales calls and
          training-team walkthroughs so visitors see the platform in
          its lived-in state, not an empty new-trainee shell.
        </p>
      </header>

      <ShowcasePanel
        initial={
          summary && summary.user.magicToken
            ? {
                exists: true,
                email: summary.user.email,
                name: summary.user.name ?? "Maya Okafor",
                magicToken: summary.user.magicToken,
                credits: summary.user.credits,
                counts: summary.counts,
                createdAt: summary.user.createdAt.toISOString(),
              }
            : { exists: false }
        }
      />

      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-sm font-semibold text-fg mb-3">How this differs from sandbox + demo</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1">Sandbox</dt>
            <dd className="text-fg leading-snug">
              One pair (employer + trainee) per admin. Personal play space
              for testing flows end-to-end. Empty-ish state by default.
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1">Demo workspace</dt>
            <dd className="text-fg leading-snug">
              Time-limited workspace minted for a specific prospect.
              Pre-populated with employer-side sample data. Auto-cleanup
              after expiry.
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1">Showcase</dt>
            <dd className="text-fg leading-snug">
              One global trainee, fully advanced state. For demos where
              you want to show what a thriving trainee account looks like.
              Never auto-deletes.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
