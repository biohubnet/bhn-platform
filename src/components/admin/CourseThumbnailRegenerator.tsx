"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Image as ImageIcon, Square, CheckSquare,
  Palette, Eraser,
} from "lucide-react";
import {
  parseOverlay,
  overlayStyle,
  DEFAULT_OVERLAY,
  BLEND_MODES,
  type ThumbnailOverlay,
} from "@/lib/courses/thumbnail-overlay";

interface Course {
  id: string;
  title: string;
  category: string | null;
  thumbnail: string | null;
  thumbnailOverlay: unknown;
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
 * Now also hosts the colour / gradient overlay builder. The builder
 * applies a CSS overlay to every thumbnail in the page (preview only)
 * so an admin can dial in colour + angle + opacity and see the
 * treatment land on actual cards before stamping it onto the DB via
 * the batch endpoint. "Apply to selected" persists; "Clear" wipes it.
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
 *   • Selection + "Regenerate selected" lets editors target specific
 *     courses instead of always running the full catalog. The same
 *     selection set drives the overlay batch — pick once, decide
 *     whether you want to regen or re-tone.
 *   • Overlay preview is live across every visible row, not just
 *     selected ones — easier to spot where the treatment looks bad
 *     before you commit. The selected subset only matters at apply
 *     time.
 */
export function CourseThumbnailRegenerator({ courses }: { courses: Course[] }) {
  const router = useRouter();

  // Course-row local state — each course has an optional optimistic
  // override + last-run motifs + last-run error.
  const [overrides, setOverrides] = useState<Record<string, RegenResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // Local override of the stored overlay per course — after Apply we
  // stamp this so the row reflects the change without a server round
  // trip. `false` is "no override yet"; `null` is "cleared".
  const [overlayOverrides, setOverlayOverrides] =
    useState<Record<string, ThumbnailOverlay | null>>({});

  // Selection set. Empty => bulk button regenerates all.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selected.size > 0 && selected.size === courses.length;
  const someSelected = selected.size > 0;

  // Bulk-run progress.
  const [running, setRunning] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  // ── Overlay builder state ────────────────────────────────────
  const [overlay, setOverlay] = useState<ThumbnailOverlay>(DEFAULT_OVERLAY);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null);

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

  async function applyOverlay(clearInstead: boolean) {
    if (!someSelected) {
      setOverlayMsg("Pick at least one course to apply the overlay to.");
      return;
    }
    const ids = Array.from(selected);
    setOverlayBusy(true);
    setOverlayMsg(null);
    try {
      const res = await fetch(`/api/admin/courses/thumbnail-overlay/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, overlay: clearInstead ? null : overlay }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; updated?: number; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Apply failed.");
      // Stamp the local override so rows reflect the change without
      // a full router.refresh (which would also re-pull thumbnails).
      const stamp = clearInstead ? null : overlay;
      setOverlayOverrides((o) => {
        const next = { ...o };
        for (const id of ids) next[id] = stamp;
        return next;
      });
      setOverlayMsg(
        clearInstead
          ? `Cleared overlay on ${j.updated ?? ids.length} course${ids.length === 1 ? "" : "s"}.`
          : `Applied overlay to ${j.updated ?? ids.length} course${ids.length === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setOverlayMsg((err as Error).message);
    } finally {
      setOverlayBusy(false);
    }
  }

  // Effective overlay per course (local override wins; otherwise the
  // server-supplied stored value, validated through parseOverlay).
  function effectiveOverlay(c: Course): ThumbnailOverlay | null {
    if (c.id in overlayOverrides) return overlayOverrides[c.id];
    return parseOverlay(c.thumbnailOverlay);
  }

  // Builder-preview style is rendered onto every row that's currently
  // selected so the admin sees the proposed overlay before applying.
  const previewStyle = useMemo(() => overlayStyle(overlay), [overlay]);

  return (
    <section className="space-y-4">
      {/* Overlay builder ────────────────────────────────────────── */}
      <OverlayBuilder
        overlay={overlay}
        setOverlay={setOverlay}
        onApply={() => applyOverlay(false)}
        onClear={() => applyOverlay(true)}
        busy={overlayBusy}
        message={overlayMsg}
        selectedCount={selected.size}
      />

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
          const stored = effectiveOverlay(c);
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

              {/* Thumbnail preview. Two overlay layers possible:
                    • the stored one (persisted, the "current" treatment)
                    • the builder preview (only while selected, shows the
                      proposed treatment swap). Both inset-0 absolute. */}
              <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-elevated border border-line flex items-center justify-center shrink-0">
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
                {/* Stored overlay (only when NOT selected — when
                    selected the builder preview replaces it). */}
                {stored && !isSel && (
                  <div className="absolute inset-0" style={overlayStyle(stored)} />
                )}
                {/* Builder preview — only on selected rows so the
                    admin can A/B-compare against unselected siblings. */}
                {isSel && (
                  <div className="absolute inset-0" style={previewStyle} />
                )}
              </div>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{c.title}</p>
                <p className="text-[11px] text-subtle truncate">
                  {c.category ?? "Uncategorised"} · {c.status}
                  {stored && (
                    <>
                      {" · "}
                      <span className="text-brand-700">overlay set</span>
                    </>
                  )}
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

/**
 * The overlay builder. Sticky panel above the row list with colour
 * pickers, gradient toggle, angle + opacity sliders, blend-mode
 * select, a swatch preview, and Apply / Clear actions wired to the
 * batch endpoint.
 *
 * Kept inside this file (rather than its own component) because every
 * piece of state it touches lives in the parent — splitting it out
 * would just be prop-drilling for the sake of file count.
 */
function OverlayBuilder({
  overlay, setOverlay, onApply, onClear, busy, message, selectedCount,
}: {
  overlay: ThumbnailOverlay;
  setOverlay: (o: ThumbnailOverlay) => void;
  onApply: () => void;
  onClear: () => void;
  busy: boolean;
  message: string | null;
  selectedCount: number;
}) {
  const isGradient = overlay.mode === "gradient";
  const previewStyle = overlayStyle(overlay);

  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-5 surface-shadow space-y-4">
      <div className="flex items-center gap-2">
        <Palette size={14} className="text-brand-600" />
        <h2 className="text-sm font-semibold text-fg">Colour / gradient overlay</h2>
        <span className="text-[11px] text-subtle">
          · non-destructive · rendered on top of the AI thumbnail
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-4 md:gap-5 items-start">
        {/* Controls */}
        <div className="space-y-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle w-16">Mode</span>
            <div className="inline-flex rounded-lg ring-1 ring-inset ring-line overflow-hidden">
              {(["solid", "gradient"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setOverlay({
                      ...overlay,
                      mode: m,
                      color2: m === "gradient" ? overlay.color2 ?? "#1e3a8a" : overlay.color2,
                    })
                  }
                  className={
                    "px-3 py-1 text-xs font-semibold transition-colors " +
                    (overlay.mode === m
                      ? "bg-brand-600 text-white"
                      : "bg-card text-muted hover:bg-elevated")
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Colours */}
          <div className="flex items-center gap-3 flex-wrap">
            <ColorField
              label={isGradient ? "From" : "Colour"}
              value={overlay.color1}
              onChange={(v) => setOverlay({ ...overlay, color1: v })}
            />
            {isGradient && (
              <>
                <ColorField
                  label="To"
                  value={overlay.color2 ?? "#1e3a8a"}
                  onChange={(v) => setOverlay({ ...overlay, color2: v })}
                />
                {/* Angle slider — only meaningful for gradients. */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">Angle</span>
                  <input
                    type="range"
                    min={0}
                    max={359}
                    value={overlay.angle}
                    onChange={(e) => setOverlay({ ...overlay, angle: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-brand-600"
                  />
                  <span className="text-[11px] font-mono tabular-nums text-fg w-9 text-right">{overlay.angle}°</span>
                </div>
              </>
            )}
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle w-16">Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(overlay.opacity * 100)}
              onChange={(e) =>
                setOverlay({ ...overlay, opacity: parseInt(e.target.value, 10) / 100 })
              }
              className="flex-1 accent-brand-600 max-w-[260px]"
            />
            <span className="text-[11px] font-mono tabular-nums text-fg w-10 text-right">
              {Math.round(overlay.opacity * 100)}%
            </span>
          </div>

          {/* Blend mode */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle w-16">Blend</span>
            <select
              value={overlay.blendMode ?? "normal"}
              onChange={(e) =>
                setOverlay({ ...overlay, blendMode: e.target.value as ThumbnailOverlay["blendMode"] })
              }
              className="bg-card border border-line rounded-lg px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              {BLEND_MODES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swatch preview — same shape as a thumbnail tile so the
            admin can read the treatment in isolation. */}
        <div className="flex items-center gap-3 md:flex-col md:items-stretch">
          <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-line shrink-0">
            {/* Stand-in for a thumbnail — a neutral gradient so the
                overlay reads as it would on real content. */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600" />
            <div className="absolute inset-0" style={previewStyle} />
          </div>
          <p className="text-[10px] text-subtle leading-snug md:text-center max-w-[140px]">
            Preview swatch.<br />Selected rows below also show the live overlay.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
        <button
          type="button"
          onClick={onApply}
          disabled={busy || selectedCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm shadow-brand-600/25"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Palette size={12} />}
          Apply overlay to {selectedCount || "selected"}{selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={busy || selectedCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          <Eraser size={12} /> Clear on selected
        </button>
        {selectedCount === 0 && (
          <span className="text-[11px] text-subtle">
            Tick courses in the list below — the overlay applies to that subset.
          </span>
        )}
        {message && (
          <span
            className={
              "ml-auto text-[11px] " +
              (message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") || message.toLowerCase().includes("invalid")
                ? "text-rose-700"
                : "text-emerald-700")
            }
          >
            {message}
          </span>
        )}
      </div>
    </section>
  );
}

function ColorField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-md border border-line bg-card cursor-pointer p-0.5"
        aria-label={label}
      />
      <span className="text-[11px] font-mono text-muted">{value}</span>
    </label>
  );
}
