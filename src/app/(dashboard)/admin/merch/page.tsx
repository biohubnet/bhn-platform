import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Package, Truck, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { getTier } from "@/lib/rewards/merch";
import { MerchActionBar } from "@/components/rewards/MerchActionBar";

/**
 * /admin/merch — fulfillment queue.
 *
 * Three sections:
 *   1. Open (CLAIMED) — ready to pack and ship. The action bar accepts
 *      carrier + tracking and posts to /api/admin/merch/[id].
 *   2. In transit (SHIPPED) — already gone out. Optional Mark Delivered.
 *   3. Closed (DELIVERED + CANCELLED) — historical, last 90 days only.
 *
 * UNCLAIMED rewards aren't in the queue — those are still on the
 * trainee's plate to fill in.
 */
export default async function AdminMerchPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // Pull everything except UNCLAIMED in one query, group in memory.
  // Volume is small — we only have two tiers and not every trainee
  // claims, so the table will likely top out at hundreds of rows.
  const rewards = await prisma.merchReward.findMany({
    where: {
      status: { in: ["CLAIMED", "SHIPPED", "DELIVERED", "CANCELLED"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      fulfilledBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { claimedAt: "asc" }],
  });

  const open       = rewards.filter((r) => r.status === "CLAIMED");
  const shipped    = rewards.filter((r) => r.status === "SHIPPED");
  const cutoff     = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const closed     = rewards.filter(
    (r) => (r.status === "DELIVERED" || r.status === "CANCELLED") && r.updatedAt >= cutoff,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Admin · Engage</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight">
          Merch fulfillment
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl">
          Bundles claimed by trainees who've crossed a credit milestone. Pack,
          ship, and attach tracking. Two tiers exist — Apprentice (2,500 cr) and
          Champion (5,000 cr). Cancel only if the address is unrecoverable.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Awaiting ship" value={open.length} accent="amber" icon={Package} />
        <Stat label="In transit"     value={shipped.length} accent="sky" icon={Truck} />
        <Stat label="Closed (90d)"   value={closed.length} accent="emerald" icon={CheckCircle2} />
      </div>

      <Section
        title="Open queue"
        subtitle="Ready to pack"
        icon={Inbox}
        empty="No open claims. Inbox is clear."
        items={open}
        renderActions={(r) => (
          <MerchActionBar id={r.id} state="CLAIMED" />
        )}
      />

      <Section
        title="In transit"
        subtitle="Shipped but not yet marked delivered"
        icon={Truck}
        empty="Nothing in flight."
        items={shipped}
        renderActions={(r) => (
          <MerchActionBar id={r.id} state="SHIPPED" />
        )}
      />

      <Section
        title="Closed (last 90 days)"
        subtitle="Delivered or cancelled — historical record"
        icon={CheckCircle2}
        empty="Nothing closed in the last 90 days."
        items={closed}
        renderActions={() => null}
      />
    </div>
  );
}

type Reward = Awaited<ReturnType<typeof prisma.merchReward.findMany>>[number] & {
  user: { id: string; name: string | null; email: string };
  fulfilledBy: { id: string; name: string | null; email: string } | null;
};

function Section({
  title, subtitle, icon: Icon, empty, items, renderActions,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  empty: string;
  items: Reward[];
  renderActions: (r: Reward) => React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden">
      <header className="flex items-center gap-2 px-5 py-3 border-b border-line">
        <Icon size={14} className="text-subtle" />
        <div>
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <p className="text-[11px] text-subtle leading-none mt-0.5">{subtitle}</p>
        </div>
        <span className="ml-auto text-xs text-subtle font-mono tabular-nums">{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-subtle text-center">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((r) => {
            const tier = getTier(r.tier);
            return (
              <li key={r.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                    <p className="text-sm font-semibold text-fg">
                      {r.user.name ?? r.user.email}
                    </p>
                    <p className="text-xs text-subtle">{r.user.email}</p>
                    <span
                      className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200"
                      title={`Tier ${r.tier}`}
                    >
                      {tier?.title ?? `Tier ${r.tier}`}
                    </span>
                    {r.shirtSize && (
                      <span className="text-[11px] font-mono uppercase text-fg bg-elevated px-1.5 py-0.5 rounded">
                        Size {r.shirtSize}
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  {r.recipientName && (
                    <div className="text-xs text-fg leading-snug font-mono bg-elevated rounded-lg px-3 py-2 mt-1.5">
                      <p className="font-semibold">{r.recipientName}</p>
                      <p>{r.addressLine1}</p>
                      {r.addressLine2 && <p>{r.addressLine2}</p>}
                      <p>
                        {r.city}, {r.region} {r.postalCode}
                      </p>
                      <p>{r.country}</p>
                      {r.phone && <p className="text-subtle mt-0.5">📞 {r.phone}</p>}
                    </div>
                  )}

                  {r.notes && (
                    <p className="text-xs text-muted leading-snug mt-2">
                      <span className="font-semibold text-fg">Notes:</span> {r.notes}
                    </p>
                  )}

                  {/* Tracking + fulfillment metadata, when present */}
                  {(r.status === "SHIPPED" || r.status === "DELIVERED") && r.trackingNumber && (
                    <p className="text-xs text-emerald-800 mt-2">
                      <Truck size={11} className="inline -mt-0.5 mr-1" />
                      {r.carrier} ·{" "}
                      {r.trackingUrl ? (
                        <a
                          href={r.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-mono"
                        >
                          {r.trackingNumber}
                        </a>
                      ) : (
                        <span className="font-mono">{r.trackingNumber}</span>
                      )}
                      {r.fulfilledBy && <span className="text-subtle"> · by {r.fulfilledBy.name ?? r.fulfilledBy.email}</span>}
                    </p>
                  )}

                  {r.status === "CANCELLED" && (
                    <p className="text-xs text-rose-800 mt-2">
                      <XCircle size={11} className="inline -mt-0.5 mr-1" />
                      Cancelled: {r.cancelledReason}
                      {r.fulfilledBy && <span className="text-subtle"> · by {r.fulfilledBy.name ?? r.fulfilledBy.email}</span>}
                    </p>
                  )}

                  <p className="text-[11px] text-subtle mt-2">
                    Claimed {r.claimedAt ? new Date(r.claimedAt).toLocaleString() : "—"}
                  </p>
                </div>

                <div className="lg:w-72 shrink-0">{renderActions(r)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({
  label, value, accent, icon: Icon,
}: {
  label: string;
  value: number;
  accent: "amber" | "sky" | "emerald";
  icon: React.ElementType;
}) {
  const tints: Record<string, string> = {
    amber:   "bg-amber-50 text-amber-800 ring-amber-200",
    sky:     "bg-sky-50 text-sky-800 ring-sky-200",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  };
  return (
    <div className={`rounded-xl ring-1 ring-inset px-4 py-3 ${tints[accent]}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">
        <Icon size={11} />
        {label}
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums leading-tight mt-1">{value}</p>
    </div>
  );
}
