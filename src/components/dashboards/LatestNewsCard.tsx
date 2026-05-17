/**
 * LatestNewsCard — compact "what's new on the platform" surface for
 * the trainee dashboard. Reads the in-code changelog registry (the
 * same one /changelog renders from), so updates ship automatically
 * the moment a new entry lands in `CHANGELOG_ENTRIES`.
 *
 * Renders the top three entries with title + a short blurb + a
 * "today / x days ago" stamp. Each row links to /changelog so the
 * trainee can dive into the full body.
 */
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { CHANGELOG_ENTRIES, type ChangelogEntry } from "@/lib/changelog/entries";

const NEWS_COUNT = 3;

/** Trim a body string to the first ~120 chars, removing markdown
 *  emphasis markers so the preview doesn't show stray asterisks. */
function snippet(body: string, max = 140): string {
  const plain = body
    .replace(/[*_`]+/g, "")
    .replace(/\n+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  // Cut at the last word boundary before max.
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}

function relativeDays(daysAgo: number): string {
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 14) return "Last week";
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
  return `${Math.floor(daysAgo / 30)} months ago`;
}

export function LatestNewsCard() {
  const entries: ChangelogEntry[] = CHANGELOG_ENTRIES.slice(0, NEWS_COUNT);
  if (entries.length === 0) return null;

  return (
    <section className="rounded-3xl bg-card border border-line surface-shadow p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-2xl bg-sky-100 text-sky-700 inline-flex items-center justify-center">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] font-black text-sky-700">
              Latest news
            </p>
            <h2 className="text-base font-bold text-fg tracking-tight">Fresh on the platform</h2>
          </div>
        </div>
        <Link
          href="/changelog"
          className="text-xs font-bold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
        >
          See all <ArrowRight size={11} />
        </Link>
      </header>

      <ul className="divide-y divide-line border-y border-line">
        {entries.map((e, idx) => (
          <li key={idx}>
            <Link
              href="/changelog"
              className="block py-3 hover:bg-elevated rounded-lg px-3 -mx-3 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    "shrink-0 mt-1 w-1.5 h-1.5 rounded-full " +
                    (e.kind === "feature"
                      ? "bg-emerald-500"
                      : e.kind === "improvement"
                        ? "bg-sky-500"
                        : e.kind === "fix"
                          ? "bg-amber-500"
                          : "bg-slate-400")
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg leading-snug group-hover:text-brand-700 transition-colors">
                    {e.title}
                  </p>
                  <p className="text-xs text-muted mt-1 leading-snug">
                    {snippet(e.body)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mt-1.5">
                    {relativeDays(e.daysAgo)} · {e.kind}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
