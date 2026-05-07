"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, X } from "lucide-react";

interface ResultRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  duration: number | null;
  creditCost: number;
  similarity: number;
}

export function CourseSearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [mode, setMode] = useState<"empty" | "semantic" | "keyword">("empty");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setMode("empty");
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const j = await res.json();
          setResults(j.results ?? []);
          setMode(j.mode ?? "keyword");
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative max-w-xl">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search courses by topic, role, or skill…"
          className="w-full bg-card border border-line rounded-lg pl-9 pr-9 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-subtle hover:text-fg"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && q && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card-solid border border-line rounded-xl shadow-2xl shadow-black/15 z-30 max-h-[480px] overflow-y-auto">
          <div className="px-4 py-2 border-b border-line text-xs text-subtle flex items-center justify-between">
            <span>
              {loading ? "Searching…" : `${results.length} ${results.length === 1 ? "match" : "matches"}`}
            </span>
            {mode === "semantic" && (
              <span className="inline-flex items-center gap-1 text-brand-600">
                <Sparkles size={11} /> Semantic
              </span>
            )}
            {mode === "keyword" && (
              <span className="text-subtle">Keyword</span>
            )}
          </div>
          {results.length === 0 && !loading ? (
            <p className="px-4 py-6 text-sm text-subtle text-center">No matches.</p>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/courses/${r.id}`}
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-elevated transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{r.title}</p>
                      {r.description && (
                        <p className="text-xs text-subtle line-clamp-2 mt-0.5">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {r.category && <span className="text-[10px] text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{r.category}</span>}
                        {r.status === "draft" && <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Draft</span>}
                      </div>
                    </div>
                    {mode === "semantic" && r.similarity > 0 && (
                      <span className="text-xs text-subtle tabular-nums shrink-0">
                        {Math.round(r.similarity * 100)}%
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
