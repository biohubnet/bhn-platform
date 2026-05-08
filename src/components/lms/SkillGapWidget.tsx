"use client";
/**
 * Trainee dashboard widget: pick (or auto-pick) an active posting,
 * see your match score, the skills you have and lack, and which BHN
 * courses cover the missing ones. Closes the training-to-job loop.
 */
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, BookOpen, Check, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PostingOpt { id: string; title: string; companyName: string }
interface MatchData {
  posting: { id: string; title: string; companyName: string };
  score: number;
  have: { id: string; name: string; required: boolean }[];
  missing: { id: string; name: string; required: boolean }[];
  courses: { courseId: string; title: string; thumbnail: string | null; duration: number | null; unlocks: string[] }[];
}

export function SkillGapWidget({ postings }: { postings: PostingOpt[] }) {
  const [postingId, setPostingId] = useState<string>(postings[0]?.id ?? "");
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postingId) return;
    setLoading(true);
    fetch(`/api/match/posting/${postingId}?as=trainee`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: MatchData) => setData(j))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [postingId]);

  if (postings.length === 0) return null;

  const tone = data
    ? data.score >= 70 ? "ok" : data.score >= 40 ? "warn" : "low"
    : null;

  return (
    <section className="bg-card border border-line rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} className="text-brand-600" />
        <h2 className="font-semibold text-fg">How you match against open postings</h2>
      </div>
      <p className="text-xs text-muted mb-3">
        Pick a posting to see how your skills line up — and what BHN courses would close the gap.
      </p>

      <select
        value={postingId}
        onChange={(e) => setPostingId(e.target.value)}
        className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 mb-4"
      >
        {postings.map((p) => (
          <option key={p.id} value={p.id}>{p.title} · {p.companyName}</option>
        ))}
      </select>

      {loading && <p className="text-sm text-muted text-center py-6">Calculating match…</p>}

      {!loading && data && (
        <div className="space-y-4">
          {/* Score gauge */}
          <div className={cn(
            "rounded-xl p-4 border flex items-center gap-4",
            tone === "ok"   ? "bg-emerald-50 border-emerald-200"
          : tone === "warn" ? "bg-amber-50 border-amber-200"
                            : "bg-rose-50 border-rose-200",
          )}>
            <div className="text-center shrink-0">
              <p className="text-3xl font-bold text-fg leading-none tabular-nums">{data.score}</p>
              <p className="text-[10px] uppercase tracking-wider text-subtle mt-1">match</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg leading-tight">{data.posting.title}</p>
              <p className="text-xs text-muted truncate">{data.posting.companyName}</p>
              <p className="text-xs mt-1.5 text-muted">
                <strong className="text-fg">{data.have.length}</strong> skills aligned · <strong className="text-fg">{data.missing.length}</strong> to learn
              </p>
            </div>
          </div>

          {/* Have / Missing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
                <Check size={10} className="text-emerald-600" /> You bring
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.have.length === 0 && <p className="text-xs text-subtle">No matches yet — start with the courses below.</p>}
                {data.have.map((h) => (
                  <span key={h.id} className="text-[11px] inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                    {h.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
                <X size={10} className="text-rose-600" /> Missing
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.missing.length === 0 && <p className="text-xs text-emerald-700">All required skills covered. Apply!</p>}
                {data.missing.map((m) => (
                  <span key={m.id} className={cn(
                    "text-[11px] inline-flex items-center gap-1 rounded-full px-2 py-0.5 border",
                    m.required
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-800 border-amber-200",
                  )}>
                    {m.name}{m.required && <span className="text-[9px]">★</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Course suggestions */}
          {data.courses.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
                <BookOpen size={10} className="text-brand-600" /> Courses that close the gap
              </p>
              <div className="space-y-1.5">
                {data.courses.slice(0, 4).map((c) => (
                  <Link
                    key={c.courseId}
                    href={`/courses/${c.courseId}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-elevated/40 border border-line hover:border-brand-200 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                      <BookOpen size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate group-hover:text-brand-700 transition-colors">{c.title}</p>
                      <p className="text-[11px] text-muted truncate">unlocks: {c.unlocks.slice(0, 3).join(" · ")}</p>
                    </div>
                    <ArrowRight size={13} className="text-subtle group-hover:text-brand-600 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !data && postingId && (
        <p className="text-sm text-muted">Couldn&apos;t load match data.</p>
      )}
    </section>
  );
}
