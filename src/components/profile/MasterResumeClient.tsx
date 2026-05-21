"use client";

/**
 * MasterResumeClient — the body of /profile/master.
 *
 * Renders the master library grouped by section + anchor. Each
 * bullet card is editable in place (textarea with autosave); add /
 * archive / drag-to-reorder live within the section. The right rail
 * holds the snapshot list with create + download actions.
 *
 * See docs/plans/master-resume.md for the master-resume design.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Loader2, FileDown, Printer, Clock, Library,
  ChevronDown, ChevronUp, RotateCcw, Archive, Sparkles, CheckCircle2, History,
} from "lucide-react";
import { useInputDialog } from "@/components/ui/InputDialog";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { ResumeContent, ResumeSectionKind } from "@/lib/resume/types";
import { SECTION_LABEL } from "@/lib/resume/types";

/** Shape of a row from GET /api/profile/master/bullets/[id]/revisions. */
interface RevisionRow {
  id: string;
  body: string;
  tags: string[];
  source: "user_edit" | "ai_rewrite" | "promoted_from_resume" | "imported_from_pdf" | string;
  createdAt: string;
}

/** Short, neutral label shown in the source chip on the revision list. */
const SOURCE_LABEL: Record<string, string> = {
  user_edit: "Edit",
  ai_rewrite: "AI",
  promoted_from_resume: "Promoted",
  imported_from_pdf: "Imported",
};

/** Compact relative-time formatter — "3m ago", "2h ago", "5d ago".
 *  Falls back to a YYYY-MM-DD string for anything older than a month so
 *  the timestamp stays scannable at a glance. */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  // Older than 30 days — show the date instead. The timestamp is
  // already an ISO string so a slice is enough.
  return iso.slice(0, 10);
}

export interface MasterBulletRow {
  id: string;
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  anchorDateRange: string | null;
  body: string;
  tags: string[];
  position: number;
  sourceResumeId: string | null;
  revisionCount: number;
  updatedAt: string;
}

export interface MasterSnapshotRow {
  id: string;
  versionNumber: number;
  name: string;
  createdAt: string;
}

export interface MasterSummary {
  id: string;
  header: ResumeContent["header"] | null;
  updatedAt: string;
}

interface Props {
  initialMaster: MasterSummary;
  initialBullets: MasterBulletRow[];
  initialSnapshots: MasterSnapshotRow[];
  initialArchivedCount: number;
}

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

export function MasterResumeClient({
  initialMaster, initialBullets, initialSnapshots, initialArchivedCount,
}: Props) {
  const [master, setMaster] = useState<MasterSummary>(initialMaster);
  const [bullets, setBullets] = useState<MasterBulletRow[]>(initialBullets);
  const [snapshots, setSnapshots] = useState<MasterSnapshotRow[]>(initialSnapshots);
  const [archivedCount, setArchivedCount] = useState(initialArchivedCount);
  const [error, setError] = useState<string | null>(null);

  const { inputDialog, node: inputNode } = useInputDialog();
  const { confirmDialog, node: confirmNode } = useConfirmDialog();

  // Group bullets by section. We use SECTION_ORDER to keep a stable
  // section ordering even when the user has bullets in some sections
  // and not others.
  const grouped = useMemo(() => {
    const buckets: Record<string, MasterBulletRow[]> = {};
    for (const b of bullets) {
      (buckets[b.sectionKind] ??= []).push(b);
    }
    for (const k of Object.keys(buckets)) {
      buckets[k].sort((a, b) => a.position - b.position);
    }
    return buckets;
  }, [bullets]);

  const presentSections = SECTION_ORDER.filter((k) => (grouped[k]?.length ?? 0) > 0);

  // ── Seed-from-resume picker (empty-state only) ──────────────────
  //
  // When the library is empty, give users a one-click path to seed it
  // from one of their existing tailored resumes. We only fetch the
  // candidate list when needed — once the library has any bullet the
  // picker disappears and we never make the call.
  const [availableResumes, setAvailableResumes] = useState<
    { id: string; name: string; lastEditedAt: string }[] | null
  >(null);
  const [pickedResumeId, setPickedResumeId] = useState<string>("");
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<
    { created: number; skipped: number; total: number; note?: string } | null
  >(null);

  const isEmpty = bullets.length === 0 && archivedCount === 0;

  useEffect(() => {
    if (!isEmpty || availableResumes !== null) return;
    let alive = true;
    fetch("/api/profile/resumes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load resumes."))))
      .then((j: { resumes?: { id: string; name: string; lastEditedAt: string; isArchived: boolean }[] }) => {
        if (!alive) return;
        const active = (j.resumes ?? []).filter((r) => !r.isArchived);
        setAvailableResumes(active);
        if (active.length > 0 && !pickedResumeId) {
          setPickedResumeId(active[0].id);
        }
      })
      .catch(() => { if (alive) setAvailableResumes([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty]);

  async function seedFromResume() {
    if (!pickedResumeId || seeding) return;
    setError(null);
    setSeedResult(null);
    setSeeding(true);
    try {
      const r = await fetch("/api/profile/resume/master/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: pickedResumeId }),
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
        setError(j.error ?? "Couldn't seed from this resume.");
        return;
      }
      setSeedResult({
        created: j.created ?? 0,
        skipped: j.skipped ?? 0,
        total: j.total ?? 0,
        note: j.note,
      });
      // Refresh the master so the freshly-extracted bullets render.
      // We don't bother with optimistic updates here — the user just
      // watched the loader spin, a hard reload of the list is fine.
      const fresh = await fetch("/api/profile/master");
      if (fresh.ok) {
        const fj = (await fresh.json()) as {
          ok?: boolean;
          master?: { header: ResumeContent["header"] | null; updatedAt: string };
          bullets?: MasterBulletRow[];
        };
        if (fj.ok && fj.bullets) setBullets(fj.bullets);
        if (fj.ok && fj.master) setMaster((m) => ({ ...m, header: fj.master!.header, updatedAt: fj.master!.updatedAt }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  // ── Bullet CRUD ─────────────────────────────────────────────────
  async function addBullet(sectionKind: ResumeSectionKind, anchorTitle: string | null = null) {
    setError(null);
    const body = await inputDialog({
      title: `New bullet · ${SECTION_LABEL[sectionKind]}`,
      description: anchorTitle ? `Under ${anchorTitle}` : "Add to this section.",
      label: "Bullet text",
      placeholder: "Led a 14-flask culture campaign…",
      defaultValue: "",
      confirmLabel: "Add",
    });
    if (body === null) return;
    if (!body.trim()) return;
    const r = await fetch("/api/profile/master/bullets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionKind,
        body,
        anchorTitle,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; bullet?: MasterBulletRow; error?: string };
    if (!r.ok || !j.ok || !j.bullet) {
      setError(j.error ?? "Couldn't add bullet.");
      return;
    }
    setBullets((s) => [...s, j.bullet!]);
  }

  async function patchBullet(id: string, patch: Partial<MasterBulletRow>) {
    // Optimistic local update.
    setBullets((s) => s.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    const r = await fetch(`/api/profile/master/bullets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Couldn't save edit.");
    }
  }

  async function archiveBullet(id: string) {
    const ok = await confirmDialog({
      title: "Archive this bullet?",
      description: "Archived bullets stay in your library but don't appear in AI tailoring or the pull panel. You can restore them from the Archive tab.",
      confirmLabel: "Archive",
      tone: "warning",
    });
    if (!ok) return;
    setBullets((s) => s.filter((b) => b.id !== id));
    setArchivedCount((n) => n + 1);
    const r = await fetch(`/api/profile/master/bullets/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Couldn't archive.");
    }
  }

  // ── Snapshots ───────────────────────────────────────────────────
  async function takeSnapshot() {
    setError(null);
    const name = await inputDialog({
      title: "Take a snapshot",
      description: "Locks the master's current state. Versioned + downloadable.",
      label: "Snapshot name",
      placeholder: "Pre-graduation polish",
      defaultValue: `Snapshot ${new Date().toLocaleDateString()}`,
      confirmLabel: "Take snapshot",
    });
    if (name === null) return;
    const r = await fetch("/api/profile/master/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; snapshot?: MasterSnapshotRow; error?: string };
    if (!r.ok || !j.ok || !j.snapshot) {
      setError(j.error ?? "Couldn't snapshot.");
      return;
    }
    setSnapshots((s) => [j.snapshot!, ...s]);
  }

  function downloadSnapshotJson(snap: MasterSnapshotRow) {
    // Open in a new tab — the endpoint sets Content-Disposition so
    // the browser downloads with the correct filename.
    window.open(`/api/profile/master/snapshots/${snap.id}/download?format=json`, "_blank");
  }

  function openSnapshotPrint(snap: MasterSnapshotRow) {
    // PDF path — open the print-friendly snapshot page in a new tab.
    // The page auto-fires the browser's print dialog, where "Save as
    // PDF" is the default destination. document.title is set to the
    // conventional filename so the suggested filename is sensible.
    window.open(`/profile/master/snapshots/${snap.id}/print?autoPrint=1`, "_blank");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-900 text-[12px] px-3 py-2">
            {error}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center bg-card-solid">
            <Library size={28} className="mx-auto text-brand-600 mb-3" />
            <h2 className="text-base font-semibold text-fg">Your library is empty</h2>
            <p className="text-[13px] text-fg-muted mt-1 max-w-md mx-auto leading-snug">
              Seed it from a resume you've already written, or add your first bullet by hand.
            </p>

            {/* Seed-from-resume picker — only when the user actually has
                tailored resumes to pull from. New users with no resumes
                fall through to the manual-add CTAs below. */}
            {availableResumes && availableResumes.length > 0 && (
              <div className="mt-5 mx-auto max-w-md rounded-xl border border-brand-200/70 bg-brand-50/40 p-3 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-brand-700" />
                  <span className="text-[12px] font-bold text-brand-900">Seed library from a resume</span>
                </div>
                <p className="text-[11.5px] text-fg-muted leading-snug mb-2.5">
                  AI reads the resume's bullets and adds anything new to your master.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={pickedResumeId}
                    onChange={(e) => setPickedResumeId(e.target.value)}
                    disabled={seeding}
                    className="flex-1 min-w-0 text-[12.5px] px-2.5 py-1.5 rounded-md bg-card-solid ring-1 ring-inset ring-line focus:outline-none focus:ring-brand-300 disabled:opacity-60"
                  >
                    {availableResumes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={seedFromResume}
                    disabled={seeding || !pickedResumeId}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {seeding ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {seeding ? "Extracting…" : "Seed"}
                  </button>
                </div>
                {seedResult && (
                  <div className="mt-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-[11.5px] px-2.5 py-1.5 flex items-start gap-1.5">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                    <span>
                      {seedResult.total === 0
                        ? (seedResult.note ?? "Nothing to extract — this resume has no bullets yet.")
                        : <>Added <strong>{seedResult.created}</strong> of {seedResult.total} bullet{seedResult.total === 1 ? "" : "s"}{seedResult.skipped > 0 ? `, skipped ${seedResult.skipped} duplicate${seedResult.skipped === 1 ? "" : "s"}` : ""}.</>}
                    </span>
                  </div>
                )}
              </div>
            )}

            <p className="mt-5 text-[11px] uppercase tracking-[0.18em] font-bold text-fg-subtle">
              Or add manually
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
              {(["experience", "skills", "education", "projects"] as ResumeSectionKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => addBullet(k)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
                >
                  <Plus size={11} /> {SECTION_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {!isEmpty && presentSections.map((kind) => (
          <SectionGroup
            key={kind}
            kind={kind}
            bullets={grouped[kind] ?? []}
            onAdd={(anchorTitle) => addBullet(kind, anchorTitle)}
            onPatch={patchBullet}
            onArchive={archiveBullet}
          />
        ))}

        {/* Always show an "add to a new section" affordance once
            there's at least one bullet. */}
        {!isEmpty && (
          <div className="rounded-2xl border border-dashed border-line p-4 bg-card-solid/50 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-fg-subtle">Add a bullet to</span>
            {SECTION_ORDER.filter((k) => !presentSections.includes(k)).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => addBullet(k)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-fg-muted ring-1 ring-line hover:bg-elevated"
              >
                <Plus size={10} /> {SECTION_LABEL[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right rail — snapshots */}
      <aside className="space-y-3">
        <div className="rounded-2xl border border-line bg-card-solid p-4">
          <h3 className="text-[10px] uppercase tracking-[0.22em] font-bold text-fg-muted">Snapshots</h3>
          <p className="text-[12px] text-fg-muted mt-1 leading-snug">
            Locked, named, downloadable versions of your master. Each version exports as JSON or as a print-friendly view (Save as PDF from your browser).
          </p>
          <button
            type="button"
            onClick={takeSnapshot}
            disabled={bullets.length === 0}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            title={bullets.length === 0 ? "Add bullets first" : "Snapshot the current state"}
          >
            <Clock size={12} /> Take snapshot
          </button>
        </div>

        {snapshots.length > 0 && (
          <div className="rounded-2xl border border-line bg-card-solid p-4">
            <h3 className="text-[10px] uppercase tracking-[0.22em] font-bold text-fg-muted mb-2">Versions</h3>
            <ul className="space-y-2">
              {snapshots.map((s) => (
                <li key={s.id} className="rounded-md border border-line/60 bg-bg/30 p-2.5 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-fg leading-tight">
                      v{s.versionNumber} · {s.name}
                    </p>
                    <p className="text-[11px] text-fg-subtle leading-tight mt-0.5">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openSnapshotPrint(s)}
                      title="Open print-friendly view (Save as PDF from your browser)"
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-fg-muted hover:bg-elevated hover:text-fg"
                    >
                      <Printer size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSnapshotJson(s)}
                      title="Download JSON"
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-fg-muted hover:bg-elevated hover:text-fg"
                    >
                      <FileDown size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {archivedCount > 0 && (
          <div className="rounded-2xl border border-line bg-card-solid p-4">
            <h3 className="text-[10px] uppercase tracking-[0.22em] font-bold text-fg-muted">Archive</h3>
            <p className="text-[12px] text-fg-muted mt-1">
              {archivedCount} archived bullet{archivedCount === 1 ? "" : "s"}.
              {" "}
              <em className="text-fg-subtle">(Restore UI coming soon — for now, archived bullets stay in your account.)</em>
            </p>
          </div>
        )}
      </aside>

      {inputNode}
      {confirmNode}
    </div>
  );
}

// ── Section group ─────────────────────────────────────────────────

function SectionGroup({
  kind, bullets, onAdd, onPatch, onArchive,
}: {
  kind: ResumeSectionKind;
  bullets: MasterBulletRow[];
  onAdd: (anchorTitle: string | null) => void;
  onPatch: (id: string, patch: Partial<MasterBulletRow>) => void;
  onArchive: (id: string) => void;
}) {
  // Group bullets within a section by anchorTitle so "Job A" + "Job B"
  // bullets visibly cluster.
  const byAnchor = useMemo(() => {
    const map = new Map<string, MasterBulletRow[]>();
    for (const b of bullets) {
      const key = b.anchorTitle ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries());
  }, [bullets]);

  return (
    <section className="rounded-2xl border border-line bg-card-solid p-5">
      <header className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-[11px] font-mono uppercase tracking-[0.22em] font-bold text-fg-muted">
          {SECTION_LABEL[kind]} · {bullets.length}
        </h2>
        {/* "Add bullet" without an anchor — useful for skills / other
            free-floating sections. Anchored adds happen inside each
            anchor group below. */}
        <button
          type="button"
          onClick={() => onAdd(null)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-brand-700 ring-1 ring-brand-200 bg-brand-50 hover:bg-brand-100"
        >
          <Plus size={11} /> Add bullet
        </button>
      </header>

      <div className="space-y-3">
        {byAnchor.map(([anchor, group]) => (
          <div key={anchor} className="rounded-xl border border-line/60 bg-bg/30 p-3">
            {anchor && (
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <div>
                  <p className="text-[13px] font-semibold text-fg leading-tight">{anchor}</p>
                  {group[0]?.anchorSubtitle && (
                    <p className="text-[11px] text-fg-muted leading-tight mt-0.5">{group[0].anchorSubtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(anchor)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg-muted hover:text-brand-700"
                >
                  <Plus size={10} /> Add to this group
                </button>
              </div>
            )}
            <ul className="space-y-1.5">
              {group.map((b) => (
                <BulletEditor
                  key={b.id}
                  bullet={b}
                  onPatch={onPatch}
                  onArchive={onArchive}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Inline bullet editor ─────────────────────────────────────────

function BulletEditor({
  bullet, onPatch, onArchive,
}: {
  bullet: MasterBulletRow;
  onPatch: (id: string, patch: Partial<MasterBulletRow>) => void;
  onArchive: (id: string) => void;
}) {
  const [body, setBody] = useState(bullet.body);
  const [tagDraft, setTagDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Revision list state — `null` means "not loaded yet"; an empty
  // array means "loaded, but no revisions" (shouldn't happen since we
  // only show the toggle when revisionCount > 0, but kept distinct
  // for clarity).
  const [revisions, setRevisions] = useState<RevisionRow[] | null>(null);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave on body changes (700ms — matches the existing
  // resume editor cadence).
  useEffect(() => {
    if (body === bullet.body) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setBusy(true);
      try { await onPatch(bullet.id, { body }); } finally { setBusy(false); }
      // The autosave wrote a new revision — drop the cached list so
      // the next expand fetches fresh.
      setRevisions(null);
    }, 700);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  async function fetchRevisions() {
    setRevisionsLoading(true);
    setRevisionsError(null);
    try {
      const r = await fetch(`/api/profile/master/bullets/${bullet.id}/revisions`);
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; revisions?: RevisionRow[]; error?: string };
      if (!r.ok || !j.ok || !Array.isArray(j.revisions)) {
        setRevisionsError(j.error ?? "Couldn't load revisions.");
        return;
      }
      setRevisions(j.revisions);
    } catch (e) {
      setRevisionsError(e instanceof Error ? e.message : "Couldn't load revisions.");
    } finally {
      setRevisionsLoading(false);
    }
  }

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    // Lazy fetch on first expand. We don't load on render because the
    // cost-per-bullet adds up on a library with dozens of entries.
    if (next && revisions === null && !revisionsLoading) {
      void fetchRevisions();
    }
  }

  async function restoreRevision(rev: RevisionRow) {
    if (rev.body === body) {
      // Already at this body — collapse the panel rather than firing
      // a pointless PATCH (which would also coalesce into the most
      // recent revision and noop on the row).
      setShowHistory(false);
      return;
    }
    setRestoringId(rev.id);
    setBody(rev.body);
    try {
      // Reuse the existing PATCH — it writes a `user_edit` revision
      // when the body changes, which is exactly the audit trail we
      // want for a restore.
      await onPatch(bullet.id, { body: rev.body });
    } finally {
      setRestoringId(null);
    }
    // Reset cached revisions; the restore wrote a new row.
    setRevisions(null);
    if (showHistory) {
      void fetchRevisions();
    }
  }

  function addTag() {
    const v = tagDraft.trim();
    if (!v) return;
    if (bullet.tags.includes(v)) { setTagDraft(""); return; }
    void onPatch(bullet.id, { tags: [...bullet.tags, v] });
    setTagDraft("");
  }
  function removeTag(t: string) {
    void onPatch(bullet.id, { tags: bullet.tags.filter((x) => x !== t) });
  }

  return (
    <li className="rounded-md bg-card-solid border border-line/60 px-2.5 py-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        style={{ fieldSizing: "content" } as React.CSSProperties}
        className="w-full bg-transparent border-0 text-[13px] leading-snug focus:outline-none focus:ring-1 focus:ring-brand-200 rounded resize-y min-h-[44px]"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap mt-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {bullet.tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => removeTag(t)}
              title="Click to remove"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-elevated text-fg-muted ring-1 ring-inset ring-line hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200"
            >
              #{t}
            </button>
          ))}
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="+ tag"
            className="text-[10.5px] px-1.5 py-0.5 rounded bg-card border border-dashed border-line w-[80px] focus:outline-none focus:border-brand-300"
          />
        </div>
        <div className="flex items-center gap-1 text-fg-subtle">
          {busy && <Loader2 size={11} className="animate-spin" />}
          {bullet.revisionCount > 0 && (
            <button
              type="button"
              onClick={toggleHistory}
              title={`${bullet.revisionCount} prior revision${bullet.revisionCount === 1 ? "" : "s"}`}
              className={cn(
                "inline-flex items-center gap-1 text-[10.5px] font-semibold hover:text-fg",
                showHistory ? "text-fg" : "text-fg-muted",
              )}
            >
              <History size={10} /> {bullet.revisionCount} {showHistory ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => onArchive(bullet.id)}
            title="Archive this bullet"
            className="inline-flex items-center justify-center w-6 h-6 rounded text-fg-muted hover:text-amber-700 hover:bg-amber-50"
          >
            <Archive size={11} />
          </button>
        </div>
      </div>
      {showHistory && (
        <div className="mt-1.5 rounded-md border border-line/60 bg-bg/30 p-2 space-y-1.5">
          {revisionsLoading && (
            <p className="text-[11px] text-fg-subtle inline-flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Loading revisions…
            </p>
          )}
          {revisionsError && (
            <p className="text-[11px] text-rose-700">{revisionsError}</p>
          )}
          {!revisionsLoading && !revisionsError && revisions && revisions.length === 0 && (
            <p className="text-[11px] text-fg-subtle italic">No prior revisions yet.</p>
          )}
          {!revisionsLoading && !revisionsError && revisions && revisions.length > 0 && (
            <ul className="space-y-1">
              {revisions.map((rev) => {
                const isCurrent = rev.body === body;
                const restoring = restoringId === rev.id;
                return (
                  <li
                    key={rev.id}
                    className="rounded border border-line/60 bg-card-solid px-2 py-1.5 text-[11.5px] flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "leading-snug",
                          isCurrent ? "text-fg-subtle italic" : "text-fg",
                        )}
                        title={rev.body}
                      >
                        {rev.body.length > 160 ? rev.body.slice(0, 157) + "…" : rev.body}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-fg-subtle">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-elevated ring-1 ring-inset ring-line text-fg-muted font-semibold uppercase tracking-wide">
                          {SOURCE_LABEL[rev.source] ?? rev.source}
                        </span>
                        <span className="font-variant-numeric tabular-nums">{relativeTime(rev.createdAt)}</span>
                        {isCurrent && (
                          <span className="text-fg-subtle">· current</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreRevision(rev)}
                      disabled={isCurrent || restoring}
                      title={isCurrent ? "This revision matches the current text" : "Restore this revision"}
                      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 bg-brand-50 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {restoring ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <RotateCcw size={10} />
                      )}
                      Restore
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!revisionsLoading && revisions && revisions.length === 10 && (
            <p className="text-[10px] text-fg-subtle">Showing the 10 most recent revisions. Older entries are archived.</p>
          )}
        </div>
      )}
    </li>
  );
}
