/**
 * The "What's on" band — events, workshops and announcements, directly
 * under the dashboard hero (never above it). Server component: the page
 * passes the groups from getLivePromos(), so the band adds no await of
 * its own. Renders nothing when there is nothing current.
 *
 * Phones get one sideways-scrolling row per kind so the band stays
 * short; md+ gets one column per kind.
 */
import type { ElementType } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ExternalLink, FlaskConical, MapPin, Megaphone } from "lucide-react";
import { formatPromoDates, PROMO_KIND_LABELS, type PromoKind } from "@/lib/dashboard-promos";
import type { PromoGroups } from "@/lib/dashboard-promos/queries";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<PromoKind, ElementType> = {
  event: CalendarDays,
  workshop: FlaskConical,
  announcement: Megaphone,
};

const GRID_COLS = ["", "", "md:grid-cols-2", "md:grid-cols-3"];

type Promo = PromoGroups[number]["items"][number];

export function DashboardPromos({ groups, canManage }: { groups: PromoGroups; canManage: boolean }) {
  if (groups.length === 0) return null;
  return (
    <section
      data-home-promos
      aria-labelledby="home-promos-title"
      className="rounded-2xl border border-line bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* The h2 keeps heading order (hero h1 → this → kind h3s). Its
            look sits on the span: globals.css styles h1–h3 unlayered, which
            beats Tailwind utilities on the heading itself. */}
        <h2 id="home-promos-title" className="text-[12px] leading-normal">
          <span className="font-sans uppercase tracking-[0.2em] font-bold text-subtle">What&apos;s on at BioHubNet</span>
        </h2>
        {canManage && (
          <Link
            href="/admin/dashboard-promos"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline shrink-0"
          >
            Manage <ArrowRight size={12} />
          </Link>
        )}
      </div>

      <div className={cn("grid gap-4", GRID_COLS[groups.length])}>
        {groups.map((g) => {
          const Icon = KIND_ICONS[g.kind];
          return (
            <div key={g.kind} className="min-w-0">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-fg mb-2">
                <Icon size={14} className="text-brand-700" aria-hidden />
                {PROMO_KIND_LABELS[g.kind]}
              </h3>
              <ul className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-px-4 pb-1 sm:-mx-5 sm:px-5 sm:scroll-px-5 md:mx-0 md:px-0 md:scroll-px-0 md:pb-0 md:flex-col md:overflow-visible">
                {g.items.map((p) => (
                  <li
                    key={p.id}
                    className={cn("snap-start shrink-0 md:w-auto", g.items.length > 1 ? "w-[85%]" : "w-full")}
                  >
                    <PromoCard promo={p} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PromoCard({ promo }: { promo: Promo }) {
  const external = !!promo.ctaHref && !promo.ctaHref.startsWith("/");
  const body = (
    <>
      {(promo.startDate || promo.location) && (
        <span className="mb-1 flex min-w-0 items-center gap-x-2 text-[11px]">
          {promo.startDate && (
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold uppercase tracking-wider text-brand-700">
              <CalendarDays size={12} aria-hidden />
              {formatPromoDates(promo.startDate, promo.endDate)}
            </span>
          )}
          {promo.location && (
            <span className="inline-flex min-w-0 items-center gap-1 text-muted">
              <MapPin size={12} className="shrink-0" aria-hidden />
              <span className="truncate">{promo.location}</span>
            </span>
          )}
        </span>
      )}
      <span className="block text-sm font-semibold text-fg leading-snug">{promo.title}</span>
      {/* No `block` here: it would override line-clamp's -webkit-box. */}
      <span className="mt-0.5 text-xs text-muted leading-relaxed line-clamp-2">{promo.summary}</span>
      {promo.ctaHref && (
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
          {promo.ctaLabel}
          {external ? <ExternalLink size={12} aria-hidden /> : <ArrowRight size={12} aria-hidden />}
        </span>
      )}
    </>
  );
  const cls = "block h-full rounded-xl border border-line px-3 py-2.5";
  if (!promo.ctaHref) return <div className={cls}>{body}</div>;
  const linkCls = cn(cls, "hover:border-brand-200 transition-colors");
  return external ? (
    <a href={promo.ctaHref} target="_blank" rel="noopener noreferrer" className={linkCls}>
      {body}
    </a>
  ) : (
    <Link href={promo.ctaHref} className={linkCls}>
      {body}
    </Link>
  );
}
