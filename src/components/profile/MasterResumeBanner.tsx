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
import { useEffect, useState } from "react";
import {
  Library, ChevronDown, ChevronUp, ArrowUpRight, FileDown,
  Clock, ArrowUp, ArrowDown, Wand2,
} from "lucide-react";

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

export function MasterResumeBanner() {
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Pull state on mount. The /api/profile/master endpoint lazy-
  // creates the row, so this also primes the master for new users.
  useEffect(() => {
    let alive = true;
    fetch("/api/profile/master")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load master.");
        return r.json();
      })
      .then((j: { ok?: boolean; stats?: MasterStats; master?: { updatedAt: string }; error?: string }) => {
        if (!alive) return;
        if (!j.ok || !j.stats) {
          setError(j.error ?? "Couldn't load master.");
        } else {
          setStats({
            bulletCount: j.stats.bulletCount,
            snapshotCount: j.stats.snapshotCount,
            latestSnapshot: j.stats.latestSnapshot ?? null,
            updatedAt: j.master?.updatedAt ?? new Date().toISOString(),
          });
        }
      })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

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
  if (error) return null;
  if (!stats) return null;

  const isEmpty = stats.bulletCount === 0;

  return (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <Link
                href="/profile/master"
                className="group inline-flex items-start gap-3 px-3.5 py-3 rounded-xl bg-card-solid ring-1 ring-inset ring-line hover:ring-brand-300 hover:bg-brand-50/60 transition-colors"
              >
                <span className="shrink-0 inline-flex w-9 h-9 rounded-lg bg-brand-600 text-white items-center justify-center">
                  <Library size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-fg leading-tight">Open master library</span>
                  <span className="block text-[11px] text-fg-muted mt-0.5">Add your first bullets section by section.</span>
                </span>
              </Link>
              <div className="inline-flex items-start gap-3 px-3.5 py-3 rounded-xl bg-card-solid/60 ring-1 ring-inset ring-dashed ring-line text-fg-subtle">
                <span className="shrink-0 inline-flex w-9 h-9 rounded-lg bg-elevated text-fg-muted items-center justify-center">
                  <Wand2 size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">AI tailor (locked)</span>
                  <span className="block text-[11px] mt-0.5">Build a library of at least a few bullets first — the AI picks from your master.</span>
                </span>
              </div>
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
              <div
                title="AI tailor flow lands in a follow-up — picks 12 best bullets via embedding similarity + LLM re-rank."
                className="inline-flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-card-solid/60 ring-1 ring-inset ring-dashed ring-line text-fg-subtle"
              >
                <Wand2 size={13} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold leading-tight">AI tailor for this role</span>
                  <span className="block text-[11px] mt-0.5 leading-tight">Coming soon.</span>
                </span>
              </div>
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
  );
}
