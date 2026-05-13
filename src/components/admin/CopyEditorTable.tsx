"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, RotateCcw, Loader2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyEntry } from "@/lib/copy-registry";

interface OverrideInfo {
  value: string;
  updatedAt: string;
}

interface Props {
  entries: CopyEntry[];
  overrides: Record<string, OverrideInfo | null>;
}

/**
 * Per-scope table rendered by /admin/copy. One row per editable
 * string in the scope. Inline edit / save / reset using the same
 * /api/admin/copy endpoint the in-page <EditableText> pencil uses.
 *
 * Override state is shown via a tiny chip ("Code default" vs
 * "Overridden · ago") so admins can scan the column and see at a
 * glance which strings have been touched.
 */
export function CopyEditorTable({ entries, overrides }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(e: CopyEntry) {
    const current = overrides[e.key]?.value ?? e.defaultText;
    setDraft(current);
    setEditing(e.key);
    setError(null);
  }

  async function save(key: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/copy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: draft }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't save.");
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function reset(key: string) {
    if (!window.confirm("Reset to the code default? You'll lose the current override.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/copy?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't reset.");
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden">
      <ul className="divide-y divide-line">
        {entries.map((e) => {
          const ov = overrides[e.key];
          const current = ov?.value ?? e.defaultText;
          const isEditing = editing === e.key;
          return (
            <li key={e.key} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg leading-tight">{e.label}</p>
                  <p className="text-[11px] text-subtle mt-0.5 font-mono">{e.key}</p>
                  <p className="text-xs text-muted mt-1 leading-snug">{e.description}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset",
                    ov
                      ? "bg-brand-50 text-brand-700 ring-brand-200"
                      : "bg-elevated text-subtle ring-line",
                  )}
                  title={ov ? `Last edited ${new Date(ov.updatedAt).toLocaleString()}` : "Showing the in-code default"}
                >
                  {ov ? "Overridden" : "Default"}
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-2 mt-2">
                  {e.multiline === false ? (
                    <input
                      type="text"
                      value={draft}
                      onChange={(ev) => setDraft(ev.target.value)}
                      disabled={busy}
                      className="w-full text-sm text-fg bg-elevated rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/60"
                      autoFocus
                    />
                  ) : (
                    <textarea
                      value={draft}
                      onChange={(ev) => setDraft(ev.target.value)}
                      disabled={busy}
                      rows={4}
                      className="w-full text-sm leading-relaxed text-fg bg-elevated rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-y"
                      autoFocus
                    />
                  )}
                  {error && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">{error}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {ov ? (
                      <button
                        onClick={() => reset(e.key)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={11} />
                        Reset
                      </button>
                    ) : <span />}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(null)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors disabled:opacity-50"
                      >
                        <X size={11} /> Cancel
                      </button>
                      <button
                        onClick={() => save(e.key)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        {busy ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3 mt-2">
                  <p className="text-sm text-fg leading-relaxed flex-1 whitespace-pre-line">
                    {current || <em className="text-subtle">(empty)</em>}
                  </p>
                  <button
                    onClick={() => openEdit(e)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-brand-700 bg-brand-50 hover:bg-brand-100 ring-1 ring-inset ring-brand-200 transition-colors"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
