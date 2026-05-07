import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Mail, Sparkles, History, Users, Ban } from "lucide-react";
import { NewsletterExportClient } from "@/components/admin/NewsletterExportClient";

export const dynamic = "force-dynamic";

interface ExportRow {
  id: string;
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
  count: number;
  exportedAt: Date;
}

export default async function NewsletterAdminPage() {
  await requireRole("admin");

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalSubscribed,
    totalNew,
    totalExported,
    totalDeclined,
    totalAlready,
    new30d,
    recentExports,
  ] = await Promise.all([
    prisma.user.count({ where: { newsletterStatus: "subscribe" } }),
    prisma.user.count({ where: { newsletterStatus: "subscribe", newsletterExportedAt: null } }),
    prisma.user.count({ where: { newsletterStatus: "subscribe", newsletterExportedAt: { not: null } } }),
    prisma.user.count({ where: { newsletterStatus: "no" } }),
    prisma.user.count({ where: { newsletterStatus: "already" } }),
    prisma.user.count({
      where: {
        newsletterStatus: "subscribe",
        newsletterSubscribedAt: { gt: since30d },
      },
    }),
    // Recent newsletter.export audit rows
    prisma.auditLog.findMany({
      where: { action: "newsletter.export" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { name: true, email: true } } },
    }).catch(() => []),
  ]);

  const exportHistory: ExportRow[] = recentExports.map((r) => {
    let count = 0;
    try {
      const parsed = r.detail ? (JSON.parse(r.detail) as { count?: number }) : null;
      count = parsed?.count ?? 0;
    } catch {}
    return {
      id: r.id,
      actorId: r.actorId,
      actorName: r.actor?.name ?? null,
      actorEmail: r.actor?.email ?? null,
      count,
      exportedAt: r.createdAt,
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Mail size={20} className="text-brand-600" />
          Newsletter exports
        </h1>
        <p className="text-sm text-muted mt-1">
          New sign-ups who chose to be added to the BioHubNet newsletter. Copy them to the clipboard, then mark them as exported so they don&apos;t appear next time.
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat icon={Sparkles} tone="brand" label="New to export" value={totalNew} />
        <Stat icon={Users}    tone="ok"    label="Subscribed total" value={totalSubscribed} />
        <Stat icon={History}  tone="muted" label="Already exported" value={totalExported} />
        <Stat icon={Mail}     tone="muted" label="Already on list" value={totalAlready} />
        <Stat icon={Ban}      tone="muted" label="Declined" value={totalDeclined} />
      </div>
      <p className="text-xs text-subtle -mt-2">
        {new30d} subscribed in the last 30 days.
      </p>

      {/* Client component handles the table, copy, and mark-as-exported flow */}
      <NewsletterExportClient />

      {/* Export history */}
      <section className="bg-card border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <History size={15} className="text-brand-600" />
          <h2 className="font-semibold text-fg">Export history</h2>
          <span className="text-xs text-subtle">most recent 10</span>
        </div>
        {exportHistory.length === 0 ? (
          <p className="text-sm text-muted">No exports yet — the next time you copy the list, an entry appears here.</p>
        ) : (
          <ul className="divide-y divide-line">
            {exportHistory.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="w-7 h-7 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Mail size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-fg truncate">
                    Copied <span className="font-semibold">{e.count}</span> address{e.count === 1 ? "" : "es"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    by {e.actorName ?? e.actorEmail ?? "system"}
                  </p>
                </div>
                <p className="text-[11px] text-subtle shrink-0">
                  {new Date(e.exportedAt).toLocaleString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon, tone, label, value,
}: {
  icon: React.ElementType;
  tone: "brand" | "ok" | "muted";
  label: string;
  value: number;
}) {
  const cls =
    tone === "brand" ? "bg-brand-50 border-brand-200 text-brand-700"
  : tone === "ok"    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                     : "bg-card-solid border-line text-muted";
  return (
    <div className={`rounded-xl border px-3 py-3 ${cls}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold inline-flex items-center gap-1.5 opacity-80">
        <Icon size={11} /> {label}
      </div>
      <p className="text-2xl font-bold mt-1.5 leading-none">{value.toLocaleString()}</p>
    </div>
  );
}
