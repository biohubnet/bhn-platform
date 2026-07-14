"use client";

/**
 * EquipReportShare — "Share externally" panel above the EQUIP tracking
 * report (report tab on /admin/equip/tracker). Mints public, no-login
 * links to the dossier at /share/equip-report/[token] so partners can
 * open the report without an account. Each link is labelable, copyable,
 * and individually revocable.
 *
 * Talks to /api/admin/equip/report-share (POST mint · GET list · DELETE
 * revoke). Admin-only on the server; this panel only renders for admins.
 */
import { useEffect, useRef, useState } from "react";
import { Share2, Copy, Check, Trash2, Plus, Loader2, ExternalLink } from "lucide-react";

interface ShareLink {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const API = "/api/admin/equip/report-share";

function urlFor(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/share/equip-report/${token}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EquipReportShare({ initialLinks }: { initialLinks: ShareLink[] }) {
  const [links, setLinks] = useState<ShareLink[]>(initialLinks);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Once the admin has created/revoked a link, our local state is the source of
  // truth; a late-resolving mount GET must not clobber that optimistic update
  // (otherwise a just-minted link vanishes, or a revoked one reappears).
  const didMutate = useRef(false);

  // Re-sync on mount in case another admin changed the set since SSR.
  useEffect(() => {
    let live = true;
    fetch(API, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live && !didMutate.current && j?.links) setLinks(j.links as ShareLink[]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(urlFor(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  async function createLink() {
    didMutate.current = true;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.link) {
        setError(j?.error || "Could not create the link.");
        return;
      }
      setLinks((prev) => [j.link as ShareLink, ...prev]);
      setLabel("");
      // Copy the fresh link immediately — the common next action.
      copy((j.link as ShareLink).token);
    } catch {
      setError("Could not create the link.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(link: ShareLink) {
    didMutate.current = true;
    setRevoking(link.id);
    setError(null);
    try {
      const res = await fetch(`${API}?token=${encodeURIComponent(link.token)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Could not revoke the link.");
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch {
      setError("Could not revoke the link.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card-solid p-4 sm:p-5 space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-fg">
            <Share2 size={13} className="text-brand-600" /> Share externally
          </h3>
          <p className="mt-0.5 max-w-2xl text-[12px] text-fg-subtle">
            Mint a link anyone can open to read this report — no login or sign-up.
            Links are unlisted (not indexed by search engines); revoke one anytime
            and it stops working immediately.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating) createLink();
            }}
            maxLength={80}
            placeholder="Label (optional) — e.g. DMZ partners"
            className="w-52 rounded-md border border-line bg-elevated px-2.5 py-1.5 text-[12px] text-fg placeholder:text-fg-subtle/70 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={createLink}
            disabled={creating}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            title="Create a new public share link"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Create link
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11.5px] font-medium text-rose-700" role="alert">
          {error}
        </p>
      )}

      {links.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-elevated/40 px-3 py-4 text-center text-[12px] text-fg-subtle">
          No external links yet. Create one to share the report outside the platform.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((link) => {
            const expired = link.expiresAt ? new Date(link.expiresAt).getTime() < Date.now() : false;
            return (
              <li
                key={link.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-elevated/50 px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[12.5px] font-medium text-fg">
                      {link.label || "Untitled link"}
                    </span>
                    {expired && (
                      <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                        expired
                      </span>
                    )}
                  </div>
                  <code className="mt-0.5 block truncate text-[11px] text-brand-700">
                    {urlFor(link.token)}
                  </code>
                  <span className="text-[10.5px] text-fg-subtle">Created {fmtDate(link.createdAt)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copy(link.token)}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-card-solid px-2 py-1.5 text-[11px] font-semibold text-fg transition hover:border-brand-400 hover:text-brand-700"
                    title="Copy the share link"
                  >
                    {copied === link.token ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copied === link.token ? "Copied" : "Copy"}
                  </button>
                  <a
                    href={urlFor(link.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md border border-line bg-card-solid p-1.5 text-fg-subtle transition hover:border-brand-400 hover:text-brand-700"
                    title="Open the link in a new tab"
                  >
                    <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => revoke(link)}
                    disabled={revoking === link.id}
                    className="inline-flex items-center rounded-md border border-line bg-card-solid p-1.5 text-fg-subtle transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-60"
                    title="Revoke this link — it stops working immediately"
                  >
                    {revoking === link.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
