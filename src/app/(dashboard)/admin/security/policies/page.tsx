import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck, FileText, History, ArrowRight, ExternalLink, Calendar,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listPolicies, type PolicyMeta } from "@/lib/security/policies";

/**
 * /admin/security/policies — security policy hub.
 *
 * Lists every markdown doc in docs/security/ in two groups:
 *
 *   • Policies & plans — evergreen governance documents (encryption
 *     posture, incident response, breach notification templates,
 *     etc.). Sorted alphabetically by title.
 *   • Operational artefacts — dated YYYY-MM-DD-* incident write-ups
 *     and roadmaps. Sorted newest-first.
 *
 * Each entry shows title, one-line description, last-modified date,
 * and an "Open" link to the rendered detail page. The markdown
 * lives in version control — this page just reads + renders it.
 * Cannot drift from source.
 *
 * Audience: admin + leadership. Auditors landing here from a
 * customer questionnaire should find every policy in one place.
 */
export const dynamic = "force-dynamic";

export default async function SecurityPoliciesHub() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const all = await listPolicies();
  const policies = all.filter((p) => p.kind === "policy");
  const operational = all.filter((p) => p.kind === "operational");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Admin · Platform · Security
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <ShieldCheck size={22} className="text-brand-600" />
          Security policies &amp; plans
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Every governance document we maintain — policies, plans, and
          operational write-ups. Source of truth is markdown in{" "}
          <code className="font-mono text-fg bg-elevated px-1 rounded">docs/security/</code>;
          this page reads + renders it. When a director or an auditor
          asks "where's the incident response plan?", point them here.
          The companion 5-minute readable view is at{" "}
          <Link href="/admin/compliance" className="text-brand-700 hover:underline font-semibold">/compliance</Link>.
        </p>
      </header>

      {/* ── Policies ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-3 inline-flex items-center gap-1.5">
          <FileText size={12} /> Policies &amp; plans
        </h2>
        {policies.length === 0 ? (
          <p className="text-sm text-muted italic">
            No policy documents in <code className="font-mono bg-elevated px-1 rounded">docs/security/</code> yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {policies.map((p) => (
              <PolicyCard key={p.slug} policy={p} />
            ))}
          </ul>
        )}
      </section>

      {/* ── Operational artefacts ───────────────────────────── */}
      {operational.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-3 inline-flex items-center gap-1.5">
            <History size={12} /> Incident reports &amp; roadmaps
          </h2>
          <ul className="space-y-2">
            {operational.map((p) => (
              <li key={p.slug} className="rounded-xl border border-line bg-card p-4">
                <Link
                  href={`/admin/security/policies/${p.slug}`}
                  className="flex items-start gap-3 group"
                >
                  <Calendar size={13} className="text-subtle shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg group-hover:text-brand-700 leading-tight">
                      {p.title}
                    </p>
                    {p.description && (
                      <p className="text-xs text-muted mt-1 leading-snug line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    size={13}
                    className="text-subtle shrink-0 mt-1 group-hover:text-brand-700 group-hover:translate-x-0.5 transition"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Source-of-truth note ─────────────────────────────── */}
      <section className="rounded-2xl border border-dashed border-line bg-card p-5 text-xs text-muted leading-relaxed">
        <p className="font-bold text-fg mb-1 inline-flex items-center gap-1.5">
          <ExternalLink size={11} /> Editing a policy
        </p>
        Policies live as markdown in the repo at{" "}
        <code className="font-mono text-fg bg-elevated px-1 rounded">docs/security/</code>.
        Edits go through a pull request — that gives us git-blame,
        review, and an auditable history. This page reads from disk
        at request time, so a merged PR is reflected on the next load
        (no rebuild needed). For the policy intent + control mapping
        per regulatory framework, see{" "}
        <Link href="/admin/compliance" className="text-brand-700 font-semibold hover:underline">
          /compliance
        </Link>
        .
      </section>
    </div>
  );
}

function PolicyCard({ policy }: { policy: PolicyMeta }) {
  return (
    <li className="rounded-2xl border border-line bg-card p-5 surface-shadow hover:border-brand-300 hover:shadow-md transition-all">
      <Link
        href={`/admin/security/policies/${policy.slug}`}
        className="block group"
      >
        <p className="text-base font-bold text-fg group-hover:text-brand-700 leading-tight">
          {policy.title}
        </p>
        <p className="text-xs text-muted mt-1.5 leading-relaxed line-clamp-3">
          {policy.description}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
          <p className="text-[10px] text-subtle font-mono">
            Updated{" "}
            {new Date(policy.updatedAt).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:underline">
            Open <ArrowRight size={11} />
          </span>
        </div>
      </Link>
    </li>
  );
}
