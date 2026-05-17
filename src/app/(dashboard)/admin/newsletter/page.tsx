import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Mail, Sparkles, History, Users, Ban, Webhook, AlertCircle } from "lucide-react";
import { NewsletterExportClient } from "@/components/admin/NewsletterExportClient";
import { mailchimpEnabled } from "@/lib/mailchimp/client";
import { PageHero } from "@/components/ui/PageHero";

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
  const integrationLive = mailchimpEnabled();

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
    prisma.user.count({ where: { newsletterStatus: "subscribe", accountKind: "real" } }),
    prisma.user.count({ where: { newsletterStatus: "subscribe", newsletterExportedAt: null, accountKind: "real" } }),
    prisma.user.count({ where: { newsletterStatus: "subscribe", newsletterExportedAt: { not: null }, accountKind: "real" } }),
    prisma.user.count({ where: { newsletterStatus: "no", accountKind: "real" } }),
    prisma.user.count({ where: { newsletterStatus: "already", accountKind: "real" } }),
    prisma.user.count({
      where: {
        newsletterStatus: "subscribe",
        newsletterSubscribedAt: { gt: since30d },
        accountKind: "real",
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
      <PageHero
        eyebrow={<><Mail size={11} /> Admin · ENGAGE</>}
        title="Newsletter exports"
        description={
          integrationLive
            ? "Mailchimp auto-sync is live: new opt-ins are pushed straight to your audience in 'pending' status — Mailchimp emails them a confirmation link, and only the click flips them to subscribed. Use the manual export tools below for backfill or when push failed."
            : "Mailchimp auto-sync isn't configured. The manual export workflow is the fallback: copy opt-ins, paste into Mailchimp, then mark them as exported here."
        }
      />

      {/* Integration status — green when env is wired up, amber when
          the legacy manual workflow is the only option. */}
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
          integrationLive
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}
      >
        {integrationLive ? (
          <Webhook size={16} className="mt-0.5 shrink-0 text-emerald-700" />
        ) : (
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-700" />
        )}
        <div className="text-xs leading-relaxed">
          <p className="font-semibold">
            Mailchimp integration: {integrationLive ? "active" : "not configured"}
          </p>
          {integrationLive ? (
            <p className="mt-0.5">
              On signup, the API calls <code className="text-[11px] font-mono">PUT /lists/{"{id}"}/members/{"{hash}"}</code>{" "}
              with <code className="text-[11px] font-mono">status_if_new=pending</code>. Inbound webhooks at{" "}
              <code className="text-[11px] font-mono">/api/webhooks/mailchimp</code> keep the BHN side in sync on
              unsubscribe / cleaned / email-change events. The Mailchimp column on the All tab below shows the
              live state per row.
            </p>
          ) : (
            <p className="mt-0.5">
              Set <code className="text-[11px] font-mono">MAILCHIMP_API_KEY</code>,{" "}
              <code className="text-[11px] font-mono">MAILCHIMP_LIST_ID</code>, and{" "}
              <code className="text-[11px] font-mono">MAILCHIMP_WEBHOOK_SECRET</code> in your env, then wire the
              webhook URL inside Mailchimp&apos;s audience settings. Until then, sign-ups land in the &quot;New to
              export&quot; tab below and the operator pushes them manually.
            </p>
          )}
        </div>
      </div>

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
