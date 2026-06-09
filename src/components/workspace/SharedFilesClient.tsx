"use client";

/**
 * File Sharing list — upload a file, copy its share link, download,
 * archive/restore, delete. Mirrors VideoProjectsClient. Share links are
 * public unguessable R2 URLs, so anyone with the link can download
 * without an account (same model as script share links).
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderUp,
  Upload,
  Loader2,
  Trash2,
  Link2,
  Check,
  Download,
  Archive,
  ArchiveRestore,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File as FileIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface SharedFileRow {
  id: string;
  title: string;
  description: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isArchived: boolean;
  shareUrl: string | null;
  createdAt: string;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.includes("zip") || mime.includes("compressed")) return FileArchive;
  if (mime.includes("pdf") || mime.startsWith("text/") || mime.includes("document")) return FileText;
  return FileIcon;
}

export function SharedFilesClient({ initialFiles }: { initialFiles: SharedFileRow[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const active = initialFiles.filter((f) => !f.isArchived);
  const archived = initialFiles.filter((f) => f.isArchived);
  const shown = showArchived ? archived : active;

  async function upload() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", pending);
      if (title.trim()) fd.set("title", title.trim());
      const res = await fetch("/api/workspace/files", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) { setError(j.error ?? "Upload failed."); return; }
      setPending(null);
      setTitle("");
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(f: SharedFileRow) {
    if (!f.shareUrl) return;
    await navigator.clipboard.writeText(f.shareUrl).catch(() => {});
    setCopiedId(f.id);
    setTimeout(() => setCopiedId((cur) => (cur === f.id ? null : cur)), 1500);
  }

  async function setArchived(id: string, isArchived: boolean) {
    await fetch(`/api/workspace/files/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived }),
    }).catch(() => {});
    router.refresh();
  }

  async function remove(f: SharedFileRow) {
    if (!confirm(`Delete "${f.title}" permanently? The share link stops working. This can't be undone.`)) return;
    await fetch(`/api/workspace/files/${f.id}?force=true`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Upload row */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(e) => setPending(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-4 py-2 text-sm font-medium text-fg hover:border-brand-400"
          >
            <FolderUp size={14} />
            {pending ? (
              <span className="max-w-[14rem] truncate">{pending.name} · {formatBytes(pending.size)}</span>
            ) : (
              "Choose a file"
            )}
          </button>
          <label className="flex-1 min-w-[14rem]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">Title (optional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && upload()}
              placeholder="Defaults to the file name"
              className="mt-1 w-full rounded-md border border-line bg-card-solid px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>
          <button
            type="button"
            onClick={upload}
            disabled={busy || !pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Up to 50 MB per file. Every file gets a public unguessable link — anyone with the link can download, no login needed.
        </p>
        {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      </Card>

      {/* Active / archived toggle */}
      {archived.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={!showArchived ? "font-bold text-brand-700" : "text-muted hover:text-fg"}
          >
            Active ({active.length})
          </button>
          <span className="text-subtle">·</span>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={showArchived ? "font-bold text-brand-700" : "text-muted hover:text-fg"}
          >
            Archived ({archived.length})
          </button>
        </div>
      )}

      {/* File grid */}
      {shown.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <FolderUp size={22} className="mx-auto text-muted" />
          <p className="mt-2 text-sm font-medium text-fg">
            {showArchived ? "No archived files" : "No shared files yet"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {showArchived ? "Archived files will appear here." : "Upload one above to get a shareable link."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => {
            const Icon = iconFor(f.mimeType);
            return (
              <Card key={f.id} className="group flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icon size={18} className="mt-0.5 shrink-0 text-brand-700" />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-fg">{f.title}</h3>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {f.fileName} · {formatBytes(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(f)}
                    title="Delete file"
                    className="shrink-0 text-muted hover:text-rose-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {f.description && (
                  <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted">{f.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => copyLink(f)}
                    disabled={!f.shareUrl}
                    className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-900 disabled:opacity-50"
                  >
                    {copiedId === f.id ? <Check size={12} /> : <Link2 size={12} />}
                    {copiedId === f.id ? "Copied!" : "Copy link"}
                  </button>
                  {f.shareUrl && (
                    <a
                      href={f.shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-900"
                    >
                      <Download size={12} /> Download
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setArchived(f.id, !f.isArchived)}
                    className="inline-flex items-center gap-1 text-muted hover:text-fg"
                  >
                    {f.isArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                    {f.isArchived ? "Restore" : "Archive"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
