"use client";

/**
 * Index client for /profile/job-folders. Lists every folder as a
 * card with quick-look chips (status · resume linked · cover letter
 * filled · interview prep filled · linked posting). Click into a
 * folder for the detail editor.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { FOLDER_TEMPLATES } from "@/lib/job-folders/templates";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, FolderOpen, Loader2, Archive, RotateCcw, Trash2, FileText, Mail, BookOpen, Briefcase, CheckSquare, Square, X, ExternalLink, Theater, Clock,
} from "lucide-react";
import { useInputDialog } from "@/components/ui/InputDialog";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface FolderRow {
  id: string;
  title: string;
  jdSnippet: string;
  status: string;
  isArchived: boolean;
  updatedAt: string;
  resume: { id: string; name: string } | null;
  posting: { id: string; title: string; companyName: string } | null;
  hasCoverLetter: boolean;
  hasInterviewPrep: boolean;
  /** Status of the linked SimulationRequest, if any. Powers the
   *  "Sim: …" chip on each card. */
  simStatus: "pending" | "generating" | "ready" | "rejected" | "failed" | null;
}

interface Props {
  initialFolders: FolderRow[];
}

/** Status presentation is now a single value per row: a 3-px vertical
 *  bar pinned to the row's left edge, in one of six hues. The pill +
 *  ring + fill combination was carrying four colours of visual weight
 *  per card; this trims that to one thin line of colour per row, plus
 *  an uppercase eyebrow label using the platform's standard muted
 *  text — no per-status fills, no rounded chip pills. */
const STATUS_META: Record<string, { label: string; bar: string }> = {
  drafting:     { label: "Drafting",     bar: "var(--brand-400)" },
  submitted:    { label: "Submitted",    bar: "#06b6d4" }, // cyan-500
  interviewing: { label: "Interviewing", bar: "#8b5cf6" }, // violet-500
  offer:        { label: "Offer",        bar: "#10b981" }, // emerald-500
  rejected:     { label: "Rejected",     bar: "#f43f5e" }, // rose-500
  closed:       { label: "Closed",       bar: "var(--fg-subtle)" },
};

export function JobFoldersIndexClient({ initialFolders }: Props) {
  const router = useRouter();
  const { inputDialog, node: dialogNode } = useInputDialog();
  const { confirmDialog, node: confirmNode } = useConfirmDialog();
  const [folders, setFolders] = useState<FolderRow[]>(initialFolders);
  const [creating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sync prop → state when the server re-renders the page with a
  // fresh list. Without this, the admin Seed / Clear tray fires
  // router.refresh(), the page re-fetches on the server with the
  // new rows, but the client snapshot frozen in useState above
  // wins on render — so the admin saw nothing new until they hit
  // F5. We watch the prop and overwrite local state when the
  // server-side identity of the list changes (new id appears,
  // existing id disappears, or any updatedAt moves).
  useEffect(() => {
    setFolders(initialFolders);
    setSelected((s) => {
      const live = new Set(initialFolders.map((f) => f.id));
      const next = new Set<string>();
      s.forEach((id) => { if (live.has(id)) next.add(id); });
      return next;
    });
  }, [initialFolders]);

  const active = folders.filter((f) => !f.isArchived);
  const archived = folders.filter((f) => f.isArchived);

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function createFolder(opts?: { templateId?: string; defaultTitle?: string }) {
    setError(null);
    const title = await inputDialog({
      title: opts?.templateId ? "New folder from template" : "New job folder",
      description: "One folder per role you're pursuing — usually \"Company · Role\".",
      label: "Folder name",
      placeholder: "STEMCELL · Process Engineer Intern",
      defaultValue: opts?.defaultTitle ?? "New job folder",
      confirmLabel: "Create",
    });
    if (title === null) return;
    startCreate(async () => {
      const r = await fetch("/api/profile/job-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "New job folder",
          ...(opts?.templateId ? { templateId: opts.templateId } : {}),
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; folder?: { id: string } };
      if (!r.ok || !j.ok || !j.folder) {
        setError(j.error ?? "Couldn't create folder.");
        return;
      }
      router.push(`/profile/job-folders/${j.folder.id}`);
    });
  }

  async function setArchived(row: FolderRow, archived: boolean) {
    setFolders((cur) => cur.map((x) => (x.id === row.id ? { ...x, isArchived: archived } : x)));
    const r = await fetch(`/api/profile/job-folders/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: archived }),
    });
    if (!r.ok) {
      setFolders((cur) => cur.map((x) => (x.id === row.id ? { ...x, isArchived: !archived } : x)));
      setError("Archive update failed.");
    }
  }

  async function hardDelete(row: FolderRow) {
    const ok = await confirmDialog({
      title: `Permanently delete "${row.title}"?`,
      description: "Irreversible. Cover letter and interview prep go with it. Archive instead if you might want it back.",
      confirmLabel: "Delete folder",
      cancelLabel: "Keep it",
      tone: "destructive",
    });
    if (!ok) return;
    setFolders((cur) => cur.filter((x) => x.id !== row.id));
    const r = await fetch(`/api/profile/job-folders/${row.id}?force=true`, { method: "DELETE" });
    if (!r.ok) {
      router.refresh();
      setError("Delete failed.");
    }
  }

  async function batchDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = await confirmDialog({
      title: `Permanently delete ${ids.length} folder${ids.length === 1 ? "" : "s"}?`,
      description: "Irreversible. Cover letters and interview prep go with them. Archive instead if you might want them back.",
      confirmLabel: `Delete ${ids.length}`,
      cancelLabel: "Keep them",
      tone: "destructive",
    });
    if (!ok) return;
    setFolders((cur) => cur.filter((x) => !ids.includes(x.id)));
    setSelected(new Set());
    await Promise.all(ids.map((id) =>
      fetch(`/api/profile/job-folders/${id}?force=true`, { method: "DELETE" }),
    ));
  }
  async function batchArchive(value: boolean) {
    const ids = Array.from(selected);
    setFolders((cur) => cur.map((x) => ids.includes(x.id) ? { ...x, isArchived: value } : x));
    setSelected(new Set());
    await Promise.all(ids.map((id) =>
      fetch(`/api/profile/job-folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: value }),
      }),
    ));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-fg-muted">
          {active.length} active{archived.length > 0 && ` · ${archived.length} archived`}
        </p>
        <div className="flex items-center gap-2">
          <TemplatePicker
            disabled={creating}
            onPick={(t) => createFolder({ templateId: t.id, defaultTitle: t.defaultFolderTitle })}
          />
          <button
            type="button"
            onClick={() => createFolder()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            New job folder
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-md px-2.5 py-1.5">
          {error}
        </p>
      )}

      {selected.size > 0 && (
        <div className="sticky top-2 z-30 rounded-xl border border-brand-300 bg-brand-50/95 backdrop-blur-sm shadow-md px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-brand-600 text-white">
              <CheckSquare size={13} />
            </span>
            <span className="text-sm font-semibold text-brand-900">{selected.size} selected</span>
            <button type="button" onClick={() => setSelected(new Set())} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-fg-muted hover:bg-fg/5">
              <X size={11} /> Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button type="button" onClick={() => batchArchive(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated">
              <Archive size={11} /> Archive
            </button>
            <button type="button" onClick={() => batchArchive(false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid ring-1 ring-inset ring-line hover:bg-elevated">
              <RotateCcw size={11} /> Restore
            </button>
            <button type="button" onClick={batchDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-rose-600 text-white hover:bg-rose-700">
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      )}

      {active.length === 0 && archived.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card-solid p-10 text-center text-sm text-fg-muted">
          <FolderOpen size={28} className="mx-auto opacity-40 mb-2" />
          <p>No folders yet. Start one for each role you&apos;re applying to — the folder will hold the JD, your tailored resume, a cover letter, and an interview prep guide.</p>
          <button
            type="button"
            onClick={() => { void createFolder(); }}
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-md bg-brand-600 text-white text-xs font-bold hover:bg-brand-700"
          >
            <Plus size={11} /> Create your first folder
          </button>
        </div>
      ) : (
        <StatusGroupedList
          rows={active}
          selected={selected}
          onToggleSelect={toggleSelected}
          onArchive={(row) => setArchived(row, true)}
          onDelete={hardDelete}
        />
      )}

      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="text-[11px] uppercase tracking-[0.18em] font-bold text-fg-muted cursor-pointer select-none pb-2 border-b border-line/60">
            Archived ({archived.length})
          </summary>
          {/* Hairline-separated rows — same flat magazine-row layout
              as the active list, just dimmed via the row's own
              isArchived branch. No rounded box wrapper. */}
          <ul className="mt-2 divide-y divide-line/60">
            {archived.map((f) => (
              <FolderCard
                key={f.id}
                row={f}
                isSelected={selected.has(f.id)}
                onToggleSelect={() => toggleSelected(f.id)}
                onRestore={() => setArchived(f, false)}
                onDelete={() => hardDelete(f)}
              />
            ))}
          </ul>
        </details>
      )}
      {dialogNode}
      {confirmNode}
    </div>
  );
}

/** Compact "x days ago" formatter used in the folder card meta row.
 *  Stays client-side so SSR/CSR don't disagree on "now"; we accept
 *  some imprecision in exchange for never hydration-mismatching.
 *  Returns null for bad input rather than a confusing "NaN ago". */
function formatUpdated(iso: string): string | null {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60)        return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60)        return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)         return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 14)       return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8)       return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function FolderCard({
  row, isSelected, onToggleSelect, onArchive, onRestore, onDelete,
}: {
  row: FolderRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_META[row.status] ?? STATUS_META.drafting;
  // Friendly relative-ish stamp for the meta row. We deliberately
  // keep this client-side so SSR/CSR can't disagree on "now".
  const updated = formatUpdated(row.updatedAt);

  // Build the inline content-indicator list ("Resume · Letter · Prep ·
  // Sim ready") as a single string of fragments separated by middots.
  // Only filled-in pieces are shown — the absence of e.g. "Letter"
  // already communicates "not written yet", same as the old chip
  // showing/hiding pattern, but without the per-piece pill colour.
  const indicators: { key: string; icon: React.ReactNode; label: string }[] = [];
  if (row.resume)           indicators.push({ key: "resume",  icon: <FileText size={11} className="opacity-70" />, label: "Resume" });
  if (row.hasCoverLetter)   indicators.push({ key: "letter",  icon: <Mail size={11} className="opacity-70" />,     label: "Letter" });
  if (row.hasInterviewPrep) indicators.push({ key: "prep",    icon: <BookOpen size={11} className="opacity-70" />, label: "Prep"   });
  if (row.simStatus)        indicators.push({ key: "sim",     icon: <Theater size={11} className="opacity-70" />, label: `Sim ${row.simStatus}` });

  return (
    <li className={
      // No rounded box, no ring — just a flat horizontal row. Hairlines
      // come from the parent's `divide-y`. Padding inside the row is
      // generous so the card still reads as a card-shaped band.
      "group relative pl-5 pr-3 py-5 transition-colors " +
      (isSelected
        ? "bg-brand-50/40"
        : row.isArchived
          ? "opacity-70"
          : "hover:bg-elevated/40")
    }>
      {/* Status accent — 3 px vertical bar pinned to the row's left
          edge. The one and only saturated colour on each card. Bumps
          to 4 px on selected so the multi-select state is legible
          without recolouring the background. */}
      <span
        aria-hidden
        className={`absolute top-4 bottom-4 left-0 rounded-r ${isSelected ? "w-1" : "w-[3px]"}`}
        style={{ backgroundColor: status.bar }}
      />

      {/* Select toggle — minimal, top-right. No background, just an
          icon swap on hover. */}
      <button
        type="button"
        onClick={onToggleSelect}
        className="absolute top-4 right-3 z-10 inline-flex items-center justify-center w-7 h-7 rounded text-fg-muted hover:text-fg"
        aria-label={isSelected ? "Deselect" : "Select"}
      >
        {isSelected ? <CheckSquare size={18} className="text-brand-700" /> : <Square size={18} />}
      </button>

      <div className="pr-9">
        {/* Status eyebrow + role line. Replaces the old status pill +
            posting-title pill: same information, no rounded chip
            backgrounds, no per-status fills. Just uppercase tracking
            on the status label tied to a middot list. */}
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle inline-flex items-center gap-2">
          <span>{status.label}</span>
          {row.posting && (
            <>
              <span aria-hidden className="text-line">·</span>
              <span className="normal-case tracking-normal font-semibold text-fg-muted inline-flex items-center gap-1.5 truncate max-w-[48ch]">
                <Briefcase size={10} className="opacity-70" />
                <span className="truncate">{row.posting.title} · {row.posting.companyName}</span>
              </span>
            </>
          )}
        </p>

        {/* Title — the visual anchor of the row. Plain hyperlink, no
            disc icon next to it. */}
        <Link href={`/profile/job-folders/${row.id}`} className="block mt-1.5">
          <h3 className="text-[16px] font-semibold text-fg leading-snug hover:underline">
            {row.title}
          </h3>
        </Link>

        {/* Updated-at meta */}
        {updated && (
          <p className="mt-1 text-[11.5px] text-fg-subtle inline-flex items-center gap-1">
            <Clock size={10} className="opacity-70" /> Updated {updated}
          </p>
        )}

        {/* JD snippet — 4-line clamp, breathable line-height. */}
        {row.jdSnippet && (
          <p className="mt-3.5 text-[12.5px] text-fg-muted line-clamp-4 leading-relaxed">
            {row.jdSnippet}
          </p>
        )}

        {/* Footer band — content indicators on the left as middot-
            separated text (no per-indicator pill colour), actions on
            the right as ghost-style text links. The whole row stays
            on one line on desktop; wraps gracefully on narrow. */}
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap text-[12px]">
          {/* Filled-in content indicators. Uniform muted colour — the
              point is "here's what's in the folder", not five different
              hues of category. */}
          {indicators.length > 0 ? (
            <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1 text-fg-muted">
              {indicators.map((ind, i) => (
                <span key={ind.key} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden className="text-line mr-1">·</span>}
                  {ind.icon}
                  <span>{ind.label}</span>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-fg-subtle italic">Nothing filled in yet</span>
          )}

          {/* Actions — text-style links, no pill backgrounds. The
              primary "Open folder" affordance is signalled by the
              brand-toned chevron rather than a coloured fill. */}
          <span className="inline-flex items-center gap-x-4 gap-y-1 flex-wrap">
            <Link
              href={`/profile/job-folders/${row.id}`}
              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
            >
              Open folder <ExternalLink size={11} />
            </Link>
            {onArchive && (
              <button
                type="button"
                onClick={onArchive}
                className="inline-flex items-center gap-1 text-fg-subtle hover:text-fg"
              >
                <Archive size={11} /> Archive
              </button>
            )}
            {onRestore && (
              <button
                type="button"
                onClick={onRestore}
                className="inline-flex items-center gap-1 text-fg-subtle hover:text-fg"
              >
                <RotateCcw size={11} /> Restore
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 text-fg-subtle hover:text-rose-700"
            >
              <Trash2 size={11} /> Delete
            </button>
          </span>
        </div>
      </div>
    </li>
  );
}

// ── Template picker ──────────────────────────────────────────────

function TemplatePicker({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (t: { id: string; defaultFolderTitle: string }) => void;
}) {
  const [open, setOpen] = useState(false);

  // Click-outside to close. Lightweight — no portal.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest("[data-template-picker]")) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" data-template-picker>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-elevated text-fg ring-1 ring-inset ring-line text-sm font-semibold hover:bg-line disabled:opacity-50 transition-colors"
      >
        <FileText size={13} />
        From template
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[280px] rounded-xl bg-card-solid shadow-2xl ring-1 ring-line z-20 overflow-hidden">
          <div className="px-3 py-2 border-b border-line bg-elevated/40">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
              Pick an archetype
            </p>
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {FOLDER_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onPick({ id: t.id, defaultFolderTitle: t.defaultFolderTitle });
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-elevated/60 flex items-start gap-2.5 border-b border-line last:border-b-0"
                >
                  <span className="text-[18px] leading-none mt-0.5">{t.glyph}</span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-fg">
                      {t.title}
                    </span>
                    <span className="block text-[11px] text-fg-muted leading-snug">
                      {t.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Status-grouped list ──────────────────────────────────────────

/** Pipeline-style grouping of active folders by their `status`
 *  field. Hidden-but-empty status groups collapse out — only
 *  buckets with at least one folder render. Acts as a soft Kanban
 *  view without the chrome of full Kanban (no drag-drop, just
 *  collapsible sections), so it scales from 1 folder to 30 with
 *  the same UI. */
const STATUS_ORDER = [
  "interviewing",
  "submitted",
  "drafting",
  "offer",
  "rejected",
  "closed",
] as const;

/** Per-group descriptive label. The colour for each group's section
 *  header now comes from the row-level status bar (same hue), not a
 *  pill background — so this map only carries the words. */
const GROUP_META: Record<string, { label: string; description: string }> = {
  drafting:     { label: "Drafting",     description: "Still tailoring" },
  submitted:    { label: "Submitted",    description: "Application sent, awaiting reply" },
  interviewing: { label: "Interviewing", description: "In the loop" },
  offer:        { label: "Offer",        description: "Decision pending" },
  rejected:     { label: "Rejected",     description: "Onward" },
  closed:       { label: "Closed",       description: "Pulled / withdrawn" },
};

function StatusGroupedList({
  rows, selected, onToggleSelect, onArchive, onDelete,
}: {
  rows: FolderRow[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onArchive: (row: FolderRow) => void;
  onDelete: (row: FolderRow) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, FolderRow[]>();
    for (const r of rows) {
      const bucket = map.get(r.status) ?? [];
      bucket.push(r);
      map.set(r.status, bucket);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-8">
      {STATUS_ORDER.map((status) => {
        const bucket = grouped.get(status);
        if (!bucket || bucket.length === 0) return null;
        const meta = GROUP_META[status];
        const statusMeta = STATUS_META[status] ?? STATUS_META.drafting;
        return (
          <section key={status}>
            {/* Section header — flat uppercase label + descriptor on
                one line, with a soft brand-tinted gradient underline
                replacing the old pill background. The status hue
                lives only in the 2-px tick to the left of the label
                (same colour as each row's vertical bar). */}
            <header className="mb-1">
              <div className="flex items-baseline gap-2.5">
                <span
                  aria-hidden
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ backgroundColor: statusMeta.bar }}
                />
                <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-fg">
                  {meta.label}
                </h2>
                <span className="text-[11.5px] text-fg-subtle">
                  {bucket.length} {bucket.length === 1 ? "folder" : "folders"} ·{" "}
                  <span className="italic">{meta.description}</span>
                </span>
              </div>
              <div className="mt-2 h-px bg-gradient-to-r from-line/80 via-line/40 to-transparent" />
            </header>
            {/* Hairline-separated folder rows — flat, no rounded box,
                no per-row ring. The whole stack reads as a single
                magazine-row list. */}
            <ul className="divide-y divide-line/60 border-b border-line/60">
              {bucket.map((f) => (
                <FolderCard
                  key={f.id}
                  row={f}
                  isSelected={selected.has(f.id)}
                  onToggleSelect={() => onToggleSelect(f.id)}
                  onArchive={() => onArchive(f)}
                  onDelete={() => onDelete(f)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

