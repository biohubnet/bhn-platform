/**
 * The "What's on" band — events, workshops and announcements, directly
 * under the dashboard hero (never above it).
 *
 * One line per item across the full width, at most PROMOS_SHOWN of them,
 * so the whole band is about four lines tall. It was three columns of
 * cards, which cost a screenful for the same handful of facts.
 *
 * Server component: the page passes the rows from getLivePromos(), so
 * the band adds no await of its own. Renders nothing when there is
 * nothing current.
 */
import type { ElementType } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ExternalLink, FlaskConical, Megaphone } from "lucide-react";
import { formatPromoDates, type PromoKind } from "@/lib/dashboard-promos";
import type { LivePromos } from "@/lib/dashboard-promos/queries";
import { cn } from "@/lib/utils";

const KINDS: Record<PromoKind, { icon: ElementType; label: string }> = {
  event: { icon: CalendarDays, label: "Event" },
  workshop: { icon: FlaskConical, label: "Workshop" },
  announcement: { icon: Megaphone, label: "Announcement" },
};

type Promo = LivePromos[number];

export function DashboardPromos({ promos, canManage }: { promos: LivePromos; canManage: boolean }) {
  if (promos.length === 0) return null;
  return (
    <section
      data-home-promos
      aria-labelledby="home-promos-title"
      className="rounded-2xl border border-line bg-card px-4 py-2.5 sm:px-5"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Styled on the span: globals.css styles h1–h3 unlayered, which
            beats Tailwind utilities on the heading itself. */}
        <h2 id="home-promos-title" className="text-[11px] leading-normal">
          <span className="font-sans uppercase tracking-[0.2em] font-bold text-subtle">What&apos;s on</span>
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

      <ul className="mt-1 divide-y divide-line">
        {promos.map((p) => (
          <li key={p.id}>
            <PromoLine promo={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PromoLine({ promo }: { promo: Promo }) {
  const kind = KINDS[promo.kind as PromoKind] ?? KINDS.announcement;
  const Icon = kind.icon;
  const external = !!promo.ctaHref && !promo.ctaHref.startsWith("/");
  const meta = [promo.summary, promo.location].filter(Boolean).join(" · ");

  const body = (
    <>
      <Icon size={14} className="shrink-0 text-brand-700" aria-hidden />
      <span className="sr-only">{kind.label}: </span>
      {promo.startDate && (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider tabular-nums text-brand-700">
          {formatPromoDates(promo.startDate, promo.endDate)}
        </span>
      )}
      {/* One line, whatever the content. On a phone the title takes what
          is left and ellipses; from sm up it is capped so the summary
          beside it still has room. */}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg sm:flex-none sm:max-w-[48%]">
        {promo.title}
      </span>
      {meta && <span className="hidden min-w-0 flex-1 truncate text-xs text-muted sm:block">{meta}</span>}
      {promo.ctaHref && (
        <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 sm:inline-flex">
          {promo.ctaLabel}
          {external ? <ExternalLink size={12} aria-hidden /> : <ArrowRight size={12} aria-hidden />}
        </span>
      )}
    </>
  );

  const cls = "flex items-center gap-2 py-2";
  if (!promo.ctaHref) return <div className={cls}>{body}</div>;
  const linkCls = cn(cls, "-mx-2 px-2 rounded-lg transition-colors hover:bg-elevated");
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
