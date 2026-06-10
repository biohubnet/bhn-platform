"use client";

/**
 * Share panel for a workspace script (admin). Creates public collaboration
 * links (/scripts/<token>), lists active ones with copy + revoke. Anyone with
 * a link can open the script without an account — they give their name, and
 * their edits are attributed in History.
 */
import { useEffect, useRef, useState } from "react";
import { Share2, Plus, Copy, Check, Trash2, Loader2, Link as LinkIcon } from "lucide-react";

interface ShareLink {
  id: string;
  token: string;
  label: string | null;
  createdAt: string;
}

export function SharePanel({ scriptId, initialLinks }: { scriptId: string; initialLinks: ShareLink[] }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ShareLink[]>(initialLinks);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-outside closes the panel.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const urlFor = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/scripts/${token}`;

  async function create() {
    setCreating(true);
    try {
      const res = await fetch(`/api/workspace/scripts/${scriptId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; link?: ShareLink };
      if (res.ok && j.ok && j.link) {
        setLinks((cur) => [j.link!, ...cur]);
        // Copy the fresh link right away — the most common next step.
        try {
          await navigator.clipboard.writeText(urlFor(j.link.token));
          setCopiedId(j.link.id);
          setTimeout(() => setCopiedId(null), 2000);
        } catch { /* clipboard denied — they can use the Copy button */ }
      }
    } finally {
      setCreating(false);
    }
  }

  async function copy(l: ShareLink) {
    try {
      await navigator.clipboard.writeText(urlFor(l.token));
      setCopiedId(l.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  async function revoke(l: ShareLink) {
    if (!confirm("Revoke this link? Anyone using it loses access immediately.")) return;
    setLinks((cur) => cur.filter((x) => x.id !== l.id));
    await fetch(`/api/workspace/scripts/${scriptId}/share?tokenId=${l.id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
      >
        <Share2 size={13} /> Share
        {links.length > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">{links.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[24rem] rounded-xl border border-line bg-card-solid p-3 shadow-elevated">
          <p className="text-sm font-semibold text-fg">Share for collaboration</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            Anyone with a link can open this script <strong>without an account</strong> — they give
            their name, edit live, and every change is attributed in History.
          </p>

          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Create link {links.length === 0 ? "" : "(another)"} — copies it
          </button>

          {links.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {links.map((l) => (
                <li key={l.id} className="flex items-center gap-2 rounded-lg border border-line bg-elevated/40 px-2.5 py-2">
                  <LinkIcon size={12} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg" title={urlFor(l.token)}>
                    /scripts/{l.token}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(l)}
                    title="Copy link"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-fg"
                  >
                    {copiedId === l.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => revoke(l)}
                    title="Revoke link"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-rose-700"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {copiedId && <p className="mt-2 text-[11px] font-medium text-emerald-700">Link copied — send it to your collaborator.</p>}
        </div>
      )}
    </div>
  );
}
