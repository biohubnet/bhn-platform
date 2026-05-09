"use client";
/**
 * Filter bar for the internships listing. Three controls:
 *   • Free-text search across title / company / details / keySkills
 *   • Location dropdown (distinct values from active postings)
 *   • Type dropdown (Internship / Co-op / etc.)
 *
 * State lives in URL searchParams (?q, ?loc, ?type) so the listing
 * page can read them server-side and a saved tab / shared link
 * preserves the filter. Client-side: a thin form that updates the
 * URL on submit / change without a full reload.
 */
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export function InternshipFilters({
  q: initialQ, loc: initialLoc, type: initialType,
  locations, types,
}: {
  q: string;
  loc: string;
  type: string;
  locations: string[];
  types: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(initialQ);
  const [loc, setLoc] = useState(initialLoc);
  const [type, setType] = useState(initialType);

  // Keep local state synced if the URL is changed by something other
  // than this form (e.g. a "Clear filters" link from the empty state).
  useEffect(() => { setQ(initialQ); }, [initialQ]);
  useEffect(() => { setLoc(initialLoc); }, [initialLoc]);
  useEffect(() => { setType(initialType); }, [initialType]);

  function navigate(next: { q?: string; loc?: string; type?: string }) {
    const sp = new URLSearchParams(params.toString());
    const apply = (k: "q" | "loc" | "type", v: string | undefined) => {
      const cleaned = (v ?? "").trim();
      if (cleaned) sp.set(k, cleaned); else sp.delete(k);
    };
    apply("q", next.q ?? q);
    apply("loc", next.loc ?? loc);
    apply("type", next.type ?? type);
    router.push(`${pathname}?${sp.toString()}`);
  }

  function clearAll() {
    setQ(""); setLoc(""); setType("");
    router.push(pathname);
  }

  const anyActive = !!(q || loc || type);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); navigate({}); }}
      className="mb-5 flex flex-wrap items-center gap-2 p-3 rounded-xl border border-line bg-card"
    >
      <div className="relative flex-1 min-w-[200px]">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
        <input
          type="search"
          placeholder="Search title, company, skill…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-card-solid text-fg border border-line rounded-lg pl-8 pr-3 py-2 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
      </div>
      <select
        value={loc}
        onChange={(e) => { setLoc(e.target.value); navigate({ loc: e.target.value }); }}
        className="bg-card-solid text-fg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      >
        <option value="">All locations</option>
        {locations.map((l) => (<option key={l} value={l}>{l}</option>))}
      </select>
      <select
        value={type}
        onChange={(e) => { setType(e.target.value); navigate({ type: e.target.value }); }}
        className="bg-card-solid text-fg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      >
        <option value="">All types</option>
        {types.map((t) => (<option key={t} value={t}>{t}</option>))}
      </select>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
      >
        Search
      </button>
      {anyActive && (
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-2 rounded-lg border border-line text-muted hover:text-fg hover:border-line-strong text-sm inline-flex items-center gap-1"
        >
          <X size={12} /> Clear
        </button>
      )}
    </form>
  );
}
