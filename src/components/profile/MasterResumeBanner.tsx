"use client";

/**
 * MasterResumeBanner — a thin collapsible bar at the top of the
 * resume tailoring page (/profile/resume?id=…) that surfaces the
 * user's master library.
 *
 * Two states:
 *  • Empty master — banner reads "You don't have a master resume
 *    yet" with a CTA to open /profile/master.
 *  • Populated   — banner shows stats (N bullets, last snapshot)
 *    and the four primary actions: open library, pull from master,
 *    AI tailor (placeholder until the AI flow lands), download
 *    latest snapshot.
 *
 * Collapsible — defaults to expanded the first time it's seen, then
 * remembers the user's preference via localStorage. The collapse
 * state is purely cosmetic; the underlying data fetch always runs.
 *
 * See docs/plans/master-resume.md.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Library, ChevronDown, ChevronUp, ArrowUpRight, FileDown,
  Clock, ArrowUp, ArrowDown, Wand2, Sparkles, Loader2, CheckCircle2,
} from "lucide-react";
import { MasterTailorDrawer } from "./MasterTailorDrawer";

interface MasterStats {
  bulletCount: number;
  snapshotCount: number;
  latestSnapshot: { id: string; versionNumber: number; name: string; createdAt: string } | null;
  updatedAt: string;
}

const COLLAPSE_KEY = "bhn:master-banner-collapsed";

/** Custom window event the banner fires when the user clicks
 *  "Pull from master". The ResumeEditor listens for this event and
 *  opens its in-tree PullFromMasterDrawer. This decouples the banner
 *  (which lives one DOM level up from the editor) from the editor's
 *  internal state without lifting the drawer's state to a shared
 *  parent client component. */
export const OPEN_MASTER_DRAWER_EVENT = "bhn:open-master-drawer";

interface BannerProps {
  /** The id of the resume the surrounding page is editing — passed
   *  through to the AI-tailor drawer + Build-from-this-draft button.
   *  Optional: the banner is loadable in contexts without a resume
   *  yet (e.g. /profile/master itself, if that ever embeds it); the
   *  AI-tailor and Build-from-this-draft buttons are hidden when
   *  this is absent because there's nothing to tailor INTO or
   *  extract FROM. Falls back to the page's ?id= query param. */
  resumeId?: string;
}

export function MasterResumeBanner({ resumeId: resumeIdProp }: BannerProps = {}) {
  const searchParams = useSearchParams();
  const resumeId = resumeIdProp ?? searchParams?.get("id") ?? null;


  const [stats, setStats] = useState<MasterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tailorOpen, setTailorOpen] = useState(false);

  // AI-extract state. Only relevant when the empty-state CTA fires.
  // `running` is the loading flag; `result` is the summary toast
  // that lives for a few seconds after a successful run. We keep
  // extract errors separate from loadError so a failed extract
  // doesn't hide the whole banner.
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<
    { created: number; skipped: number; total: number; note?: string } | null
  >(null);

  // Pull state on mount. The /api/profile/master endpoint lazy-
  // creates the row, so this also primes the master for new users.
  async function refreshStats() {
    const r = await fetch("/api/profile/master");
    if (!r.ok) throw new Error("Failed to load master.");
    const j = (await r.json()) as {
      ok?: boolean; stats?: MasterStats; master?: { updatedAt: string }; error?: string;
    };
    if (!j.ok || !j.stats) {
      throw new Error(j.error ?? "Couldn't load master.");
    }
    setStats({
      bulletCount: j.stats.bulletCount,
      snapshotCount: j.stats.snapshotCount,
      latestSnapshot: j.stats.latestSnapshot ?? null,
      updatedAt: j.master?.updatedAt ?? new Date().toISOString(),
    });
  }

  useEffect(() => {
    let alive = true;
    refreshStats()
      .catch((e: Error) => { if (alive) setLoadError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function buildFromThisDraft() {
    if (!resumeId || extracting) return;
    setExtractError(null);
    setExtractResult(null);
    setExtracting(true);
    try {
      const r = await fetch("/api/profile/resume/master/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        created?: number;
        skipped?: number;
        total?: number;
        note?: string;
        error?: string;
      };
      if (!r.ok || !j.ok) {
        setExtractError(j.error ?? "Couldn't extract bullets — try again.");
      } else {
        setExtractResult({
          created: j.created ?? 0,
          skipped: j.skipped ?? 0,
          total: j.total ?? 0,
          note: j.note,
        });
        await refreshStats();
      }
    } catch (e) {
      setExtractError((e as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  // Read persisted collapse preference once on mount.
  useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSE_KEY);
      if (v === "1") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);
  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  // Hide entirely while loading — avoids layout shift on the
  // tailoring page. Surfaces the banner only when we know the user's
  // state.
  if (loading) return null;
  if (loadError) return null;
  if (!stats) return null;

  const isEmpty = stats.bulletCount === 0;

  return (
    <>
    <section
      role="region"
      aria-label="Master resume library"
      className="rounded-2xl border border-brand-200/70 bg-gradient-to-r from-brand-50 via-brand-50/50 to-card-solid"
    >
      {/* Header strip — always visible. Clicking toggles expand. */}
      <button
        type="button"
        onClick={toggleCollapse}
        aria-expanded={!collapsed}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50/40 transition-colors rounded-2xl"
      >
        <span className="shrink-0 inline-flex w-8 h-8 rounded-lg bg-brand-600 text-white items-center justify-center">
          <Library size={15} />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[12px] font-bold text-brand-900 leading-tight">
            Master resume
          </p>
          <p className="text-[11px] text-fg-muted leading-tight mt-0.5">
            {isEmpty
              ? "You don't have a library yet — start one to pull from on every draft."
              : `${stats.bulletCount} bullet${stats.bulletCount === 1 ? "" : "s"} in your library${stats.latestSnapshot ? ` · v${stats.latestSnapshot.versionNumber} last snapshot` : ""}.`
            }
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded text-fg-muted">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>

      {/* Expanded body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-1 border-t border-brand-100/60 mt-1">
          {isEmpty ? (
            <div className="space-y-2 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {resumeId ? (
                  <button
                    type="button"
                    onClick={buildFromThisDraft}
                    disabled={extracting}
                    className="group text-left inline-flex items-start gap-3 px-3.5 py-3 rounded-xl bg-brand-600 text-white ring-1 ring-inset ring-brand-700 hover:bg-brand-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="shrink-0 inline-flex w-9 h-9 rounded-lg bg-white/15 text-white items-center justify-center">
                      {extracting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-tight">
                        {extracting ? "Extracting…" : "Build master from this draft"}
                      </span>
                      <span className="block text-[11px] text-white/85 mt-0.5">
                        {extracting
                          ? "AI is reading your bullets — hang tight."
                          : "AI reads this resume's bullets and seeds your library in one click."}
                      </span>
                    </span>
                  </button>
                ) : (
                  <div
                    title="Open a specific resume (e.g. from /profile/resumes) to use this action."
                    className="inline-flex items-start gap-3 px-3.5 py-3 rounded-xl bg-card-solid/60 ring-1 ring-inset ring-dashed ring-line text-fg-subtle"
                  >
                    <span className="shrink-0 inline-flex w-9 h-9 rounded-lg bg-elevated text-fg-muted items-center justify-center">
                      <Sparkles size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight">Build master from a draft</span>
                      <span className="block text-[11px] mt-0.5">Open a specific resume first to seed your library from it.</span>
                    </span>
                  </div>
                )}
                <Link
                  href="/profile/master"
                  className="group inline-flex items-start gap-3 px-3.5 py-3 rounded-xl bg-card-solid ring-1 ring-inset ring-line hover:ring-brand-300 hover:bg-brand-50/60 transition-colors"
                >
                  <span className="shrink-0 inline-flex w-9 h-9 rounded-lg bg-elevated text-brand-700 items-center justify-center">
                    <Library size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-fg leading-tight">Open master library</span>
                    <span className="block text-[11px] text-fg-muted mt-0.5">Or add bullets by hand, section by section.</span>
                  </span>
                </Link>
              </div>
              {extractResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-[12px] px-3 py-2 flex items-start gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    {extractResult.total === 0 ? (
                      <span>{extractResult.note ?? "Nothing to extract — this resume has no bullets yet."}</span>
                    ) : (
                      <span>
                        Added <strong>{extractResult.created}</strong> of {extractResult.total} bullet{extractResult.total === 1 ? "" : "s"} to your master
                        {extractResult.skipped > 0 ? ` (skipped ${extractResult.skipped} duplicate${extractResult.skipped === 1 ? "" : "s"})` : ""}.
                      </span>
                    )}
                  </div>
                </div>
              )}
              {extractError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-900 text-[12px] px-3 py-2">
                  {extractError}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
              <Link
                href="/profile/master"
                className="group inline-flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-card-solid ring-1 ring-inset ring-line hover:ring-brand-300 hover:bg-brand-50/60 transition-colors"
              >
                <ArrowUpRight size={13} className="text-brand-700 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-fg leading-tight">Open master library</span>
                  <span className="block text-[11px] text-fg-muted mt-0.5 leading-tight">Edit, add, archive bullets.</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent(OPEN_MASTER_DRAWER_EVENT));
                }}
                title="Open the master library in a right-side drawer — drag a bullet onto any entry to insert it, or use Send to → from each card"
                className="group inline-flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-card-solid ring-1 ring-inset ring-line hover:ring-brand-300 hover:bg-brand-50/60 transition-colors text-left"
              >
                <ArrowDown size={13} className="text-brand-700 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-fg leading-tight">Pull from master</span>
                  <span className="block text-[11px] text-fg-muted mt-0.5 leading-tight">Drag a bullet onto an entry, or use Send to.</span>
                </span>
              </button>
              {resumeId ? (
                <button
                  type="button"
                  onClick={() => setTailorOpen(true)}
                  className="group inline-flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-card-solid ring-1 ring-inset ring-line hover:ring-brand-300 hover:bg-brand-50/60 transition-colors text-left"
                  title={`Pick the 12 best bullets from your ${stats.bulletCount}-bullet library + light-rewrite to match the role.`}
                >
                  <Wand2 size={13} className="text-brand-700 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-bold text-fg leading-tight">AI tailor for this role</span>
                    <span className="block text-[11px] text-fg-muted mt-0.5 leading-tight">Pick + rewrite 12 best bullets.</span>
                  </span>
                </button>
              ) : (
                <div
                  title="Open a resume tailoring page first — the AI tailor inserts bullets into the resume you're editing."
                  className="inline-flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-card-solid/60 ring-1 ring-inset ring-dashed ring-line text-fg-subtle"
                >
                  <Wand2 size={13} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold leading-tight">AI tailor for this role</span>
                    <span className="block text-[11px] mt-0.5 leading-tight">Open a resume to enable.</span>
                  </span>
                </div>
              )}
              <div
                title="Once you edit a bullet that came from your master library, a chip appears beneath it offering to push the improved wording back to the master."
                className="inline-flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-card-solid ring-1 ring-inset ring-line text-fg"
              >
                <ArrowUp size={13} className="text-brand-700 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold leading-tight">Promote edits to master</span>
                  <span className="block text-[11px] text-fg-muted mt-0.5 leading-tight">Edit a pulled bullet — a chip will offer to push the improvement back.</span>
                </span>
              </div>
            </div>
          )}

          {/* Footer chips — snapshot info + open-library + download. */}
          {!isEmpty && (
            <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-fg-muted">
              {stats.latestSnapshot ? (
                <>
                  <Clock size={11} />
                  <span>
                    Latest snapshot: <strong className="text-fg">v{stats.latestSnapshot.versionNumber} · {stats.latestSnapshot.name}</strong> ({new Date(stats.latestSnapshot.createdAt).toLocaleDateString()})
                  </span>
                  <a
                    href={`/api/profile/master/snapshots/${stats.latestSnapshot.id}/download?format=json`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    <FileDown size={11} /> Download
                  </a>
                </>
              ) : (
                <>
                  <Clock size={11} />
                  <span>No snapshots yet — take one from the library to lock + download a version.</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
    {resumeId && (
      <MasterTailorDrawer
        open={tailorOpen}
        onClose={() => setTailorOpen(false)}
        resumeId={resumeId}
        libraryBulletCount={stats.bulletCount}
      />
    )}
    </>
  );
}
