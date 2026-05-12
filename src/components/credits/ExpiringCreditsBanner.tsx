import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { nextExpiringGrant } from "@/lib/credits/expiry";

/**
 * Dashboard banner shown to any trainee whose nearest credit grant
 * has an expiry on the horizon. Server-rendered — no client state.
 *
 * Three visual urgency levels keyed off daysRemaining:
 *   ≤ 7   rose   "Last call"
 *   ≤ 30  amber  "Expiring soon"
 *   ≤ 90  brand  "Plan ahead"
 *   > 90  null   (we render nothing — too far out to nag)
 *
 * Returns null entirely (renders nothing) when:
 *   • The user has no live credit grant with an expiry timer, or
 *   • The next-expiring grant is more than 90 days away.
 */
export async function ExpiringCreditsBanner({ userId }: { userId: string }) {
  const next = await nextExpiringGrant(userId);
  if (!next) return null;
  if (next.daysRemaining > 90) return null;

  const tone =
    next.daysRemaining <= 7 ? "rose"
    : next.daysRemaining <= 30 ? "amber"
    : "brand";

  const heading =
    tone === "rose" ? "Last call to use your training credits"
    : tone === "amber" ? "Your training credits expire soon"
    : "Plan ahead — your training credits have an expiry";

  const subhead = `${next.amount.toLocaleString()} credits expire ${next.daysRemaining === 0 ? "today" : `in ${next.daysRemaining} day${next.daysRemaining === 1 ? "" : "s"}`} (${next.expiresAt.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}).`;

  // Tailwind classes per tone — kept inline for readability.
  const card =
    tone === "rose" ? "from-rose-50 to-rose-100 border-rose-200 hover:border-rose-300"
    : tone === "amber" ? "from-amber-50 to-amber-100 border-amber-200 hover:border-amber-300"
    : "from-brand-50 to-brand-100 border-brand-200 hover:border-brand-300";
  const icon =
    tone === "rose" ? "bg-rose-500"
    : tone === "amber" ? "bg-amber-500"
    : "bg-brand-600";
  const headColor =
    tone === "rose" ? "text-rose-900"
    : tone === "amber" ? "text-amber-900"
    : "text-brand-900";
  const subColor =
    tone === "rose" ? "text-rose-800"
    : tone === "amber" ? "text-amber-800"
    : "text-brand-800";
  const chevColor =
    tone === "rose" ? "text-rose-700"
    : tone === "amber" ? "text-amber-700"
    : "text-brand-700";

  return (
    <Link
      href="/courses"
      className={`block bg-gradient-to-r border rounded-2xl px-5 py-3.5 transition-colors ${card}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 ${icon}`}>
          <Clock size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${headColor}`}>{heading}</p>
          <p className={`text-xs mt-0.5 ${subColor}`}>
            {subhead} Browse the catalog to find courses you'd like to take.
          </p>
        </div>
        <ArrowRight size={16} className={`mt-2 ${chevColor}`} />
      </div>
    </Link>
  );
}
