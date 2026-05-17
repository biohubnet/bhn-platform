/**
 * /admin/design-system/sidebar-groups — sample comparison page
 * for the ADMINISTRATION sub-group separator treatments.
 *
 * Renders 10 candidate styles side-by-side in faithful mini-
 * sidebar fragments. The user picks one, then we apply that
 * treatment to the real Sidebar.tsx in a follow-up commit.
 * Nothing here changes the live sidebar.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { SidebarGroupingSamples } from "@/components/admin/SidebarGroupingSamples";

export const dynamic = "force-dynamic";

export default async function SidebarGroupingSamplesPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link href="/admin/design-system" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Design system
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Admin · proposal</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Layers size={22} className="text-brand-600" />
          Sidebar sub-group separator — 10 options
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl leading-relaxed">
          The ADMINISTRATION block in the LMS sidebar now has 7 sub-groups (Engage / Experience / Equip / Insights / Platform / Security &amp; compliance / System). They're separated only by a small uppercase heading today, which doesn&apos;t give the eye enough to grab onto when scanning. Pick one of the treatments below and we&apos;ll apply it for real.
        </p>
        <p className="text-[11px] text-subtle mt-3 leading-snug max-w-3xl">
          Each sample renders three representative sub-groups (Engage, Equip, Platform) with three items each using the same chrome the real sidebar uses. The only variable across samples is the separator treatment.
        </p>
      </header>

      <SidebarGroupingSamples />

      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <p className="text-sm font-bold text-fg">Pick one</p>
        <p className="text-xs text-muted mt-1 leading-snug">
          Tell me the option number (1–10) — I&apos;ll apply it to the real <code className="font-mono">Sidebar.tsx</code> in a follow-up commit, removing this samples route once a pick is made. You can also combine two — e.g. <em>Option 1 (hairline above) + Option 6 (tone dot)</em> — if that reads better than any single option.
        </p>
      </section>
    </div>
  );
}
