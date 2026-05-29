"use client";

/**
 * PullFromMasterDrawer — right-side drawer for pulling bullets from
 * the user's master library into the active resume draft.
 *
 * Two interaction paths:
 *
 *   • **Drag-from-master** — every bullet card carries a drag handle.
 *     Drag starts a copy operation with two payloads on dataTransfer:
 *       - `text/plain` = "master:<bulletId>" (universal fallback)
 *       - `application/x-bhn-master-bullet` = "<bulletId>" (used by
 *         the resume editor's drop targets to detect the drag kind
 *         from dragover, without having to read text/plain).
 *
 *   • **Send to** — clicking the chip on a card opens an inline
 *     picker (section → item). Clicking Send fires the same callback
 *     the drop path uses, so persistence + state-replacement happens
 *     through one code path on the editor side.
 *
 * The drawer fetches /api/profile/master on open and groups bullets
 * by section. Empty state + error states surface inline. The
 * underlying data fetch always runs on open so a freshly-added master
 * bullet shows up the moment the drawer is re-opened.
 *
 * Owner-only by design — only renders inside the trainee's own
 * resume editor at /profile/resume.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  X, Library, Loader2, Send, ArrowDown, GripVertical,
} from "lucide-react";
import type { ResumeContent, ResumeSectionKind } from "@/lib/resume/types";
import { SECTION_LABEL, SECTION_KIND_COLOR } from "@/lib/resume/types";

interface MasterBulletRow {
  id: string;
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  anchorDateRange: string | null;
  body: string;
  tags: string[];
  position: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Live content of the current draft — feeds the "Send to" picker
   *  so users can target a specific (section, item) without dragging. */
  content: ResumeContent;
  /** Persist + return; the editor's handler hits the pull-from-master
   *  endpoint and replaces local state with the server's response. */
  onSendToTarget: (args: {
    masterBulletId: string;
    targetSectionId: string;
    targetItemId: string;
  }) => Promise<void>;
}

// Section ordering for the drawer matches /profile/master.
const SECTION_ORDER: ResumeSectionKind[] = [
  "summary",
  "experience",
  "skills",
  "projects",
  "education",
  "certifications",
  "publications",
  "awards",
  "volunteering",
  "other",
];

export function PullFromMasterDrawer({ open, onClose, content, onSendToTarget }: Props) {
  const [bullets, setBullets] = useState<MasterBulletRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which bullet's inline "Send to" picker is currently open. Only
  // one picker can be open at a time so the drawer stays scannable.
  const [pickerForBulletId, setPickerForBulletId] = useState<string | null>(null);
  const [pickerSection, setPickerSection] = useState<string>("");
  const [pickerItem, setPickerItem] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  // ── Lazy fetch on open ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetch("/api/profile/master")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load master library.");
        return r.json();
      })
      .then((j: { ok?: boolean; bullets?: MasterBulletRow[]; error?: string }) => {
        if (!alive) return;
        if (!j.ok) setError(j.error ?? "Couldn't load master.");
        else setBullets(j.bullets ?? []);
      })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open]);

  // Close on Escape — standard drawer behaviour.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Group bullets by section using the canonical SECTION_ORDER so the
  // drawer reads in the same order as /profile/master.
  const grouped = useMemo(() => {
    const buckets: Record<string, MasterBulletRow[]> = {};
    for (const b of bullets) (buckets[b.sectionKind] ??= []).push(b);
    for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => a.position - b.position);
    const ordered: [ResumeSectionKind, MasterBulletRow[]][] = [];
    for (const k of SECTION_ORDER) {
      if (buckets[k]?.length) ordered.push([k, buckets[k]]);
    }
    // Anything that doesn't map to a known section (shouldn't happen,
    // but the schema is permissive) goes to the bottom under "other".
    const extras = Object.entries(buckets).filter(([k]) =>
      !SECTION_ORDER.includes(k as ResumeSectionKind),
    );
    for (const [k, list] of extras) ordered.push([k as ResumeSectionKind, list]);
    return ordered;
  }, [bullets]);

  // The "Send to" picker needs draft sections with at least one item
  // to target — otherwise there's nothing to send into.
  const draftSections = useMemo(
    () => content.sections.filter((s) => s.items.length > 0),
    [content.sections],
  );
  const pickerSectionItems = useMemo(
    () => content.sections.find((s) => s.id === pickerSection)?.items ?? [],
    [content.sections, pickerSection],
  );

  function startSendTo(bulletId: string) {
    setPickerForBulletId(bulletId);
    const first = draftSections[0] ?? null;
    setPickerSection(first?.id ?? "");
    setPickerItem(first?.items[0]?.id ?? "");
  }
  function cancelSendTo() {
    setPickerForBulletId(null);
    setPickerSection("");
    setPickerItem("");
  }
  async function confirmSendTo() {
    if (!pickerForBulletId || !pickerSection || !pickerItem) return;
    setBusy(pickerForBulletId);
    try {
      await onSendToTarget({
        masterBulletId: pickerForBulletId,
        targetSectionId: pickerSection,
        targetItemId: pickerItem,
      });
      cancelSendTo();
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* NON-modal side panel — deliberately NO backdrop. The whole
          point of "pull from master" is to drag a bullet from here
          straight into a resume bullet list, so the editor must stay
          fully visible AND interactive to the left. A backdrop would
          (a) blur the editor and (b) sit above it, intercepting the
          drag before the drop target ever fired. Close via X or Esc.
          Fixed right, full-height, capped width so it doesn't swallow
          the editor on narrow viewports. */}
      <aside
        role="dialog"
        aria-modal="false"
        aria-label="Pull from master library"
        className="fixed right-0 top-0 bottom-0 z-50 w-[400px] max-w-[calc(100vw-1rem)] bg-card-solid border-l border-line shadow-2xl flex flex-col"
      >
        <header className="px-4 py-3 border-b border-line flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex w-8 h-8 rounded-lg bg-brand-50 text-brand-700 items-center justify-center shrink-0">
              <Library size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-fg leading-tight">Pull from master</p>
              <p className="text-[11px] text-fg-muted leading-tight">
                Drag a bullet into the editor, or use Send to…
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-fg-muted hover:bg-elevated"
            title="Close drawer (Esc)"
            aria-label="Close drawer"
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12 text-fg-muted">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
          {error && (
            <div className="text-[12px] text-rose-700 rounded-md bg-rose-50 ring-1 ring-rose-200 p-2.5">
              {error}
            </div>
          )}
          {!loading && !error && bullets.length === 0 && (
            <div className="rounded-xl border border-dashed border-line p-5 text-center text-fg-muted">
              <Library size={20} className="mx-auto text-brand-600 mb-2" />
              <p className="text-[12px]">Your master library is empty.</p>
              <Link
                href="/profile/master"
                className="text-[11.5px] text-brand-700 font-semibold hover:underline mt-1 inline-block"
              >
                Add bullets to your library →
              </Link>
            </div>
          )}

          {grouped.map(([sectionKind, sectionBullets]) => (
            <section key={sectionKind} className="space-y-1.5">
              <h3 className="text-[10px] uppercase tracking-[0.22em] font-bold text-fg-subtle px-1 inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: SECTION_KIND_COLOR[sectionKind] }}
                />
                {SECTION_LABEL[sectionKind] ?? sectionKind} · {sectionBullets.length}
              </h3>
              <ul className="space-y-1.5">
                {sectionBullets.map((b) => {
                  const isPickerOpen = pickerForBulletId === b.id;
                  return (
                    <li
                      key={b.id}
                      className="rounded-md bg-bg/40 ring-1 ring-line/60 border-l-4 p-2.5"
                      style={{ borderLeftColor: SECTION_KIND_COLOR[sectionKind] }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "copy";
                            e.dataTransfer.setData("text/plain", "master:" + b.id);
                            // Custom MIME so the editor's dragover
                            // handler can identify the drag kind
                            // without reading text/plain (which most
                            // browsers don't expose during dragover).
                            e.dataTransfer.setData("application/x-bhn-master-bullet", b.id);
                          }}
                          className="mt-0.5 shrink-0 inline-flex items-center justify-center w-4 h-5 rounded text-fg-subtle hover:text-fg hover:bg-elevated cursor-grab active:cursor-grabbing"
                          title="Drag into a bullet list in your resume"
                          aria-label="Drag bullet from master library"
                        >
                          <GripVertical size={11} />
                        </span>
                        <div className="min-w-0 flex-1">
                          {b.anchorTitle && (
                            <p className="text-[10px] font-semibold text-fg-muted leading-tight mb-0.5">
                              {b.anchorTitle}
                              {b.anchorSubtitle ? (
                                <span className="text-fg-subtle font-normal"> · {b.anchorSubtitle}</span>
                              ) : null}
                            </p>
                          )}
                          <p className="text-[12px] text-fg leading-snug whitespace-pre-wrap">
                            {b.body}
                          </p>
                          {b.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {b.tags.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center text-[9.5px] font-semibold text-fg-muted ring-1 ring-line rounded-full px-1.5 py-0.5"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => (isPickerOpen ? cancelSendTo() : startSendTo(b.id))}
                          className={
                            "shrink-0 inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-bold uppercase tracking-[0.14em] " +
                            (isPickerOpen
                              ? "bg-brand-100 text-brand-800 ring-1 ring-brand-200"
                              : "text-brand-700 hover:bg-brand-50")
                          }
                          title="Pick a target section + entry without dragging"
                        >
                          <Send size={9} /> {isPickerOpen ? "Cancel" : "Send to"}
                        </button>
                      </div>
                      {isPickerOpen && (
                        <div className="mt-2 space-y-1.5 rounded-md ring-1 ring-brand-200 bg-brand-50/40 p-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand-800">
                            Send to entry in this draft
                          </p>
                          {draftSections.length === 0 ? (
                            <p className="text-[11.5px] text-fg-muted leading-snug">
                              Your draft has no entries yet — add a section + entry first, then come back.
                            </p>
                          ) : (
                            <>
                              <select
                                value={pickerSection}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setPickerSection(v);
                                  const firstItem = content.sections.find((s) => s.id === v)?.items[0];
                                  setPickerItem(firstItem?.id ?? "");
                                }}
                                className="w-full bg-card border border-line rounded px-2 py-1 text-[12px] focus:outline-none focus:border-brand-300"
                                aria-label="Target section"
                              >
                                {draftSections.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title || SECTION_LABEL[s.kind]} ({s.items.length} entr{s.items.length === 1 ? "y" : "ies"})
                                  </option>
                                ))}
                              </select>
                              <select
                                value={pickerItem}
                                onChange={(e) => setPickerItem(e.target.value)}
                                disabled={pickerSectionItems.length === 0}
                                className="w-full bg-card border border-line rounded px-2 py-1 text-[12px] focus:outline-none focus:border-brand-300 disabled:opacity-50"
                                aria-label="Target entry"
                              >
                                {pickerSectionItems.length === 0 && <option value="">— No entries —</option>}
                                {pickerSectionItems.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {entryLabel(it.title, it.subtitle, it.dateRange)}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={cancelSendTo}
                                  className="px-2 py-1 rounded text-[10.5px] font-medium text-fg-muted hover:bg-fg/5"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={confirmSendTo}
                                  disabled={!pickerSection || !pickerItem || busy === b.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-600 text-white text-[10.5px] font-bold uppercase tracking-[0.14em] hover:bg-brand-700 disabled:opacity-50"
                                >
                                  {busy === b.id ? <Loader2 size={9} className="animate-spin" /> : <ArrowDown size={9} />}
                                  Send
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="px-3 py-2 border-t border-line text-[10.5px] text-fg-subtle flex items-center justify-between shrink-0">
          <Link href="/profile/master" className="text-brand-700 hover:underline font-semibold">
            Edit your master library →
          </Link>
          <span>Pulled bullets stay linked to their source.</span>
        </footer>
      </aside>
    </>
  );
}

/** Short label for an item in the "Send to" picker. Falls back through
 *  title → subtitle → dateRange → "Entry" so every option has something
 *  recognisable even when the entry is sparsely filled. */
function entryLabel(title?: string, subtitle?: string, dateRange?: string): string {
  const t = (title ?? "").trim();
  const s = (subtitle ?? "").trim();
  const d = (dateRange ?? "").trim();
  if (t && s) return `${t} · ${s}`;
  if (t) return t;
  if (s) return s;
  if (d) return d;
  return "Entry";
}
