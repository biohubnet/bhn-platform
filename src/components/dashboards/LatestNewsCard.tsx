/**
 * LatestNewsCard — compact "what's new on the platform" surface
 * for the trainee dashboard. Reads the in-code changelog registry
 * (same one /changelog renders from).
 *
 * Renders flat (no outer rounded box) — its host section provides
 * the gradient wash. Just header + divide-y list of three entries.
 */
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { CHANGELOG_ENTRIES, type ChangelogEntry } from "@/lib/changelog/entries";

const NEWS_COUNT = 3;

function snippet(body: string, max = 140): string {
  const plain = body
    .replace(/[*_`]+/g, "")
    .replace(/\n+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
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
    <section>
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-2">
          <Sparkles size={14} className="text-sky-600" />
          <p className="text-[10px] uppercase tracking-[0.22em] font-black text-sky-700">
            Fresh on the platform
          </p>
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
              className="flex items-start gap-3 py-3 group hover:bg-elevated/60 transition-colors -mx-2 px-2"
            >
              <span
                className={
                  "shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full " +
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
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle mt-1.5">
                  {relativeDays(e.daysAgo)} · {e.kind}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
