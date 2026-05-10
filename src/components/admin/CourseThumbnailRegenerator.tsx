"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Image as ImageIcon, Square, CheckSquare,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  category: string | null;
  thumbnail: string | null;
  status: string;
}

interface RegenResult {
  thumbnail: string;
  motifs: string[];
}

/**
 * Bulk + per-course thumbnail regenerator. Calls
 * /api/admin/courses/[id]/thumbnail/regenerate one course at a time
 * (sequential — Cloudflare AI is rate-limited per account, and the
 * progress bar is more honest about wall-clock time when serialized).
 *
 * UX choices
 *   • Local optimistic state: when a course finishes, swap the
 *     thumbnail in the row immediately so the admin sees the result
 *     without a full page refresh.
 *   • Cache-bust the new image URL with ?t=<timestamp>, otherwise
 *     <img> can read a stale entry from the browser cache when the
 *     R2 URL ends in the same .png filename pattern.
 *   • Motif chips render alongside each row so admins can see what
 *     the LLM extracted — debugging tool for catalog editors.
 *   • Selection mode + "Regenerate selected" lets editors target
 *     specific courses (e.g. only ones whose thumbnails look off)
 *     instead of always running the full catalog.
 */
export function CourseThumbnailRegenerator({ courses }: { courses: Course[] }) {
  const router = useRouter();

  // Course-row local state — each course has an optional optimistic
  // override + last-run motifs + last-run error.
  const [overrides, setOverrides] = useState<Record<string, RegenResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // Selection set. Empty => bulk button regenerates all.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selected.size > 0 && selected.size === courses.length;
  const someSelected = selected.size > 0;

  // Bulk-run progress.
  const [running, setRunning] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(courses.map((c) => c.id)));
  }
  function toggleOne(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function regenOne(courseId: string): Promise<RegenResult | null> {
    setBusyIds((s) => new Set(s).add(courseId));
    setErrors((e) => { const n = { ...e }; delete n[courseId]; return n; });
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/thumbnail/regenerate`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        thumbnail?: string;
        motifs?: string[];
        error?: string;
      };
      if (!res.ok || !j.thumbnail) {
        throw new Error(j.error ?? "Regeneration failed.");
      }
      const result: RegenResult = {
        thumbnail: `${j.thumbnail}?t=${Date.now()}`, // cache-bust
        motifs: j.motifs ?? [],
      };
      setOverrides((o) => ({ ...o, [courseId]: result }));
      return result;
    } catch (err) {
      setErrors((e) => ({ ...e, [courseId]: (err as Error).message }));
      return null;
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(courseId);
        return n;
      });
    }
  }

  async function regenBatch(targets: Course[]) {
    setRunning(true);
    setCancelled(false);
    setCompleted(0);
    setTotal(targets.length);
    for (const c of targets) {
      if (cancelled) break;
      await regenOne(c.id);
      setCompleted((n) => n + 1);
    }
    setRunning(false);
    // After a bulk run, refresh the server data so reload reflects
    // persisted state (we already showed it optimistically).
    router.refresh();
  }

  function startBulk() {
    const targets = someSelected
      ? courses.filter((c) => selected.has(c.id))
      : courses;
    if (targets.length === 0) return;
    if (!confirm(`Regenerate ${targets.length} thumbnail${targets.length === 1 ? "" : "s"}? Each takes ~5–10 seconds.`)) return;
    regenBatch(targets);
  }

  return (
    <section className="space-y-4">
      {/* Action bar */}
      <div className="rounded-2xl border border-line bg-card p-4 surface-shadow flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          {allSelected ? "Deselect all" : "Select all"}
        </button>
        <span className="text-xs text-subtle">
          {someSelected ? `${selected.size} selected` : "Nothing selected — bulk runs the full catalog"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {running && (
            <button
              type="button"
              onClick={() => setCancelled(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors"
            >
              Stop after current
            </button>
          )}
          <button
            type="button"
            onClick={startBulk}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm shadow-brand-600/25"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {running
              ? `Regenerating ${completed}/${total}…`
              : someSelected
              ? `Regenerate ${selected.size} selected`
              : "Regenerate all"}
          </button>
        </div>
      </div>

      {/* Progress bar (only while running) */}
      {running && total > 0 && (
        <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${Math.round((completed / total) * 100)}%` }}
          />
        </div>
      )}

      {/* Course rows */}
      <ul className="rounded-2xl border border-line bg-card surface-shadow divide-y divide-line overflow-hidden">
        {courses.map((c) => {
          const override = overrides[c.id];
          const error = errors[c.id];
          const busy = busyIds.has(c.id);
          const thumb = override?.thumbnail ?? c.thumbnail;
          const isSel = selected.has(c.id);
          return (
            <li key={c.id} className="px-4 py-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => toggleOne(c.id)}
                className="text-muted hover:text-fg shrink-0"
                aria-label={isSel ? "Deselect" : "Select"}
              >
                {isSel ? <CheckSquare size={15} /> : <Square size={15} />}
              </button>

              {/* Thumbnail preview */}
              <div className="w-20 h-12 rounded-lg overflow-hidden bg-elevated border border-line flex items-center justify-center shrink-0">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <ImageIcon size={16} className="text-subtle" />
                )}
              </div>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{c.title}</p>
                <p className="text-[11px] text-subtle truncate">
                  {c.category ?? "Uncategorised"} · {c.status}
                </p>
                {override?.motifs && override.motifs.length > 0 && (
                  <p className="text-[10px] text-muted truncate mt-0.5">
                    Motifs: {override.motifs.join(", ")}
                  </p>
                )}
                {error && (
                  <p className="text-[11px] text-rose-700 mt-0.5 inline-flex items-center gap-1">
                    <AlertCircle size={10} /> {error}
                  </p>
                )}
                {override && !error && (
                  <p className="text-[10px] text-emerald-700 mt-0.5 inline-flex items-center gap-1">
                    <CheckCircle2 size={10} /> Regenerated this session
                  </p>
                )}
              </div>

              {/* Per-row action */}
              <button
                type="button"
                onClick={() => regenOne(c.id)}
                disabled={busy || running}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-fg hover:bg-elevated disabled:opacity-40 transition-colors shrink-0"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {busy ? "Generating…" : "Regenerate"}
              </button>
            </li>
          );
        })}
        {courses.length === 0 && (
          <li className="px-4 py-8 text-sm text-subtle text-center">
            No courses in the catalog yet.
          </li>
        )}
      </ul>
    </section>
  );
}
