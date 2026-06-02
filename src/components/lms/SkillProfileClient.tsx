"use client";
/**
 * Trainee-facing skill profile editor.
 *
 *   - Existing skills shown as a category-grouped list with level
 *     pip-display and per-row controls (raise/lower level, delete).
 *   - Suggestions panel shows top platform skills the trainee doesn't
 *     have; click to self-claim.
 *   - Source badges so the trainee can see *why* a skill is on their
 *     profile (course-inferred / resume / self / admin).
 */
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, BookOpen, FileText, X, Plus, ChevronUp, ChevronDown, User, Search, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MySkill {
  id: string;
  skillId: string;
  name: string;
  category: string | null;
  level: number;
  source: string;
  evidence: unknown;
}

interface Suggestion {
  id: string;
  name: string;
  category: string | null;
}

const SOURCE_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  inferred: { label: "from course", icon: BookOpen,  cls: "bg-brand-50 text-brand-700 border-brand-200" },
  resume:   { label: "resume",      icon: FileText,  cls: "bg-amber-50 text-amber-800 border-amber-200" },
  self:     { label: "self",        icon: User,      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ai:       { label: "AI tagged",   icon: Sparkles,  cls: "bg-elevated text-muted border-line" },
  admin:    { label: "admin",       icon: User,      cls: "bg-elevated text-muted border-line" },
};

export function SkillProfileClient({
  initialMine, suggestions,
}: {
  initialMine: MySkill[];
  suggestions: Suggestion[];
}) {
  const [mine, setMine] = useState<MySkill[]>(initialMine);
  const [suggested, setSuggested] = useState<Suggestion[]>(suggestions);
  const [busy, setBusy] = useState(false);
  // Search-and-add state. The user types, we debounce ~200ms then
  // hit /api/profile/skills/search?q=… for matches not already on
  // their profile. Empty query falls back to the curated suggestions.
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchQ.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/profile/skills/search?q=${encodeURIComponent(q)}`);
        const j = (await r.json().catch(() => ({}))) as { skills?: Suggestion[] };
        setSearchResults(j.skills ?? []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQ]);

  // Group by category for readable display
  const grouped = new Map<string, MySkill[]>();
  for (const m of mine) {
    const cat = m.category ?? "Other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(m);
  }
  const categories = Array.from(grouped.keys()).sort();

  async function bumpLevel(s: MySkill, delta: number) {
    const next = Math.max(0, Math.min(1, s.level + delta));
    setBusy(true);
    try {
      await fetch("/api/profile/skills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, level: next }),
      });
      setMine((cur) => cur.map((m) => (m.id === s.id ? { ...m, level: next, source: "self" } : m)));
    } finally { setBusy(false); }
  }

  async function remove(s: MySkill) {
    setBusy(true);
    try {
      await fetch(`/api/profile/skills?id=${s.id}`, { method: "DELETE" });
      setMine((cur) => cur.filter((m) => m.id !== s.id));
      // Add it back to suggestions so they can re-claim if they regret.
      setSuggested((cur) => [{ id: s.skillId, name: s.name, category: s.category }, ...cur].slice(0, 30));
    } finally { setBusy(false); }
  }

  async function claim(s: Suggestion) {
    setBusy(true);
    try {
      const r = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: s.id, level: 0.6 }),
      });
      if (r.ok) {
        const j = await r.json();
        setMine((cur) => [
          { id: j.skill.id, skillId: s.id, name: s.name, category: s.category, level: 0.6, source: "self", evidence: null },
          ...cur,
        ]);
        setSuggested((cur) => cur.filter((c) => c.id !== s.id));
        setSearchResults((cur) => cur.filter((c) => c.id !== s.id));
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {/* Mine */}
      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="font-semibold text-fg mb-3">Skills on your profile</h2>
        {mine.length === 0 ? (
          <div className="py-8 px-6 text-center space-y-3 rounded-xl border border-dashed border-line bg-background/30">
            <span className="inline-flex w-12 h-12 rounded-xl bg-brand-50 text-brand-700 items-center justify-center ring-1 ring-inset ring-brand-200">
              <Sparkles size={20} />
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-fg">No skills on your profile yet</h3>
              <p className="text-sm text-fg-muted max-w-md mx-auto">
                Skills are how postings match you. Complete a course to earn one automatically, or use the search below to claim ones you already have.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-2">{cat}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {grouped.get(cat)!.map((s) => (
                    <SkillRow
                      key={s.id}
                      skill={s}
                      busy={busy}
                      onUp={() => bumpLevel(s, 0.1)}
                      onDown={() => bumpLevel(s, -0.1)}
                      onRemove={() => remove(s)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add a skill — search & add. Type to find any platform skill
          not already on the profile; empty input falls back to the
          curated "popular" chips (the original behaviour). */}
      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="font-semibold text-fg mb-1">Add a skill</h2>
        <p className="text-xs text-muted mb-3">
          Search any platform skill, or pick from the popular list below. Adds at <em>working</em> level
          — you can adjust afterwards.
        </p>

        {/* Search input */}
        <label className="relative block mb-3">
          <span className="sr-only">Search skills</span>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search skills — e.g. python, GMP, cell culture…"
            className="w-full bg-card-solid border border-line focus:border-brand-300 focus:ring-2 focus:ring-brand-200 rounded-xl pl-9 pr-9 py-2 text-sm transition-all outline-none"
            aria-label="Search skills"
            autoComplete="off"
          />
          {searching && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle animate-spin" />
          )}
          {searchQ && !searching && (
            <button
              type="button"
              onClick={() => setSearchQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-fg p-1 rounded"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </label>

        {/* Results pane — search results when typing, curated chips
            otherwise. Empty-results case calls out the lack of a
            match (instead of silently showing nothing). */}
        {searchQ.trim() ? (
          searchResults.length === 0 && !searching ? (
            <p className="text-xs text-muted italic px-1 py-2">
              No skills matched &ldquo;{searchQ.trim()}&rdquo;. Try a different word or check the popular list below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => claim(s)}
                  disabled={busy}
                  className="text-xs bg-elevated/50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-line rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  <Plus size={11} className="inline -mt-0.5 mr-1" />
                  {s.name}
                  {s.category && <span className="text-subtle ml-1">· {s.category}</span>}
                </button>
              ))}
            </div>
          )
        ) : suggested.length > 0 ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
              Popular · employers look for these
            </p>
            <div className="flex flex-wrap gap-2">
              {suggested.map((s) => (
                <button
                  key={s.id}
                  onClick={() => claim(s)}
                  disabled={busy}
                  className="text-xs bg-elevated/50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-line rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  <Plus size={11} className="inline -mt-0.5 mr-1" />
                  {s.name}
                  {s.category && <span className="text-subtle ml-1">· {s.category}</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted italic px-1 py-2">
            Type to find any skill on the platform.
          </p>
        )}
      </section>
    </div>
  );
}

function SkillRow({
  skill, busy, onUp, onDown, onRemove,
}: {
  skill: MySkill;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const meta = SOURCE_META[skill.source] ?? SOURCE_META.ai;
  const Icon = meta.icon;
  const pips = Math.round(skill.level * 5);
  return (
    <div className="border border-line rounded-xl px-3 py-2.5 bg-card-solid hover:border-brand-200 transition-colors group">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-fg text-sm leading-tight">{skill.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {/* Level pips */}
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "w-3 h-1 rounded-full transition-colors",
                    i < pips ? "bg-brand-500" : "bg-elevated",
                  )}
                />
              ))}
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border",
              meta.cls,
            )}>
              <Icon size={9} /> {meta.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
          <button onClick={onUp}     disabled={busy || skill.level >= 1} className="p-1 rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-40" title="Raise level"><ChevronUp size={13} /></button>
          <button onClick={onDown}   disabled={busy || skill.level <= 0} className="p-1 rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-40" title="Lower level"><ChevronDown size={13} /></button>
          <button onClick={onRemove} disabled={busy} className="p-1 rounded text-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40" title="Remove from profile"><X size={13} /></button>
        </div>
      </div>
    </div>
  );
}
