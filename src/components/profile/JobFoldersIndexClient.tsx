"use client";

/**
 * Index client for /profile/job-folders. Lists every folder as a
 * card with quick-look chips (status · resume linked · cover letter
 * filled · interview prep filled · linked posting). Click into a
 * folder for the detail editor.
 */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, FolderOpen, Loader2, Archive, RotateCcw, Trash2, FileText, Mail, BookOpen, Briefcase, CheckSquare, Square, X, ExternalLink, Theater,
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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  drafting:     { label: "Drafting",     cls: "bg-card-solid text-fg-muted ring-line" },
  submitted:    { label: "Submitted",    cls: "bg-cyan-50 text-cyan-900 ring-cyan-200" },
  interviewing: { label: "Interviewing", cls: "bg-violet-50 text-violet-900 ring-violet-200" },
  offer:        { label: "Offer",        cls: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  rejected:     { label: "Rejected",     cls: "bg-rose-50 text-rose-900 ring-rose-200" },
  closed:       { label: "Closed",       cls: "bg-amber-50 text-amber-900 ring-amber-200" },
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

  async function createFolder() {
    setError(null);
    const title = await inputDialog({
      title: "New job folder",
      description: "One folder per role you're pursuing — usually \"Company · Role\".",
      label: "Folder name",
      placeholder: "STEMCELL · Process Engineer Intern",
      defaultValue: "New job folder",
      confirmLabel: "Create",
    });
    if (title === null) return;
    startCreate(async () => {
      const r = await fetch("/api/profile/job-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "New job folder" }),
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
        <button
          type="button"
          onClick={createFolder}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          New job folder
        </button>
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
            onClick={createFolder}
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-md bg-brand-600 text-white text-xs font-bold hover:bg-brand-700"
          >
            <Plus size={11} /> Create your first folder
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map((f) => (
            <FolderCard
              key={f.id}
              row={f}
              isSelected={selected.has(f.id)}
              onToggleSelect={() => toggleSelected(f.id)}
              onArchive={() => setArchived(f, true)}
              onDelete={() => hardDelete(f)}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="rounded-xl border border-dashed border-line p-3 mt-6">
          <summary className="text-[11px] uppercase tracking-[0.18em] font-bold text-fg-muted cursor-pointer select-none">
            Archived ({archived.length})
          </summary>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
  return (
    <li className={
      "relative rounded-xl border p-3 transition-colors " +
      (isSelected
        ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-300"
        : row.isArchived
          ? "border-line bg-bg/30"
          : "border-line bg-card-solid hover:bg-elevated")
    }>
      <button
        type="button"
        onClick={onToggleSelect}
        className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-6 h-6 rounded text-fg-muted hover:text-fg hover:bg-elevated"
        aria-label={isSelected ? "Deselect" : "Select"}
      >
        {isSelected ? <CheckSquare size={16} className="text-brand-700" /> : <Square size={16} />}
      </button>

      <div className="flex items-start gap-3 pr-7">
        <span className="shrink-0 inline-flex w-10 h-10 rounded-xl bg-brand-50 text-brand-700 items-center justify-center ring-1 ring-inset ring-brand-200">
          <FolderOpen size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/job-folders/${row.id}`}>
            <p className="text-sm font-semibold text-fg leading-tight hover:underline truncate">{row.title}</p>
          </Link>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.14em] font-bold ring-1 ring-inset ${status.cls}`}>
              {status.label}
            </span>
            {row.posting && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-900 ring-1 ring-inset ring-cyan-200">
                <Briefcase size={9} /> {row.posting.companyName}
              </span>
            )}
            {row.resume && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">
                <FileText size={9} /> Resume
              </span>
            )}
            {row.hasCoverLetter && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-900 ring-1 ring-inset ring-violet-200">
                <Mail size={9} /> Letter
              </span>
            )}
            {row.hasInterviewPrep && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-200">
                <BookOpen size={9} /> Prep
              </span>
            )}
            {row.simStatus && (
              <SimStatusChip status={row.simStatus} />
            )}
          </div>
        </div>
      </div>

      {row.jdSnippet && (
        <p className="mt-3 text-[12px] text-fg-muted line-clamp-2 leading-snug">
          {row.jdSnippet}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <Link
          href={`/profile/job-folders/${row.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-700"
        >
          <FolderOpen size={11} /> Open folder
        </Link>
        {onArchive && (
          <button
            type="button"
            onClick={onArchive}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50"
          >
            <Archive size={11} /> Archive
          </button>
        )}
        {onRestore && (
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
          >
            <RotateCcw size={11} /> Restore
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
      {row.posting && (
        <div className="absolute bottom-3 right-3 text-[10px] text-fg-subtle inline-flex items-center gap-1">
          <ExternalLink size={9} />
        </div>
      )}
    </li>
  );
}

/** Status chip rendered alongside the other folder-content chips
 *  (Resume / Letter / Prep) when this folder has a linked
 *  SimulationRequest. Five states map to five visual tones. */
function SimStatusChip({ status }: { status: NonNullable<FolderRow["simStatus"]> }) {
  const meta: Record<typeof status, { cls: string; label: string }> = {
    pending:    { cls: "bg-amber-50 text-amber-900 ring-amber-200",   label: "Sim queued"      },
    generating: { cls: "bg-sky-50 text-sky-900 ring-sky-200",         label: "Sim generating"  },
    ready:      { cls: "bg-emerald-50 text-emerald-900 ring-emerald-200", label: "Sim ready"   },
    failed:     { cls: "bg-rose-50 text-rose-900 ring-rose-200",      label: "Sim failed"      },
    rejected:   { cls: "bg-rose-50 text-rose-900 ring-rose-200",      label: "Sim rejected"    },
  };
  const m = meta[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ring-1 ring-inset ${m.cls}`}>
      <Theater size={9} /> {m.label}
    </span>
  );
}
