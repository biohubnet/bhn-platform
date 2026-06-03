"use client";

/**
 * "Share" affordance for a Simulation. Any signed-in user (any role)
 * can mint a public, no-login link that lets ANYONE play the sim and
 * leave a comment. Clicking opens a small popover with the link + a
 * copy button. The link is reused if one already exists, so repeated
 * clicks don't pile up tokens.
 */
import { useState } from "react";
import { Share2, Check, Copy, Loader2, Link2 } from "lucide-react";

export function ShareSimButton({
  simulationId,
  jobTitle,
}: {
  simulationId: string;
  jobTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setOpen(true);
    if (url || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulator/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulationId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not create a share link.");
      }
      setUrl(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the field stays selectable as a fallback */
    }
  }

  return (
    <div className="relative">
      <button
        onClick={generate}
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-medium text-fg transition hover:border-brand-400 hover:text-brand-700"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-50 mt-2 w-[320px] rounded-lg border border-line-strong bg-card-solid p-4 shadow-modal">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-fg">
              <Link2 className="h-4 w-4 text-brand-600" />
              Public play link
            </div>
            <p className="mb-3 text-[12px] leading-snug text-fg-muted">
              Anyone with this link can play
              {jobTitle ? ` “${jobTitle}”` : " this simulation"} and leave a
              comment — no account or login required.
            </p>

            {loading && (
              <div className="flex items-center gap-2 text-[12.5px] text-fg-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating
                link…
              </div>
            )}

            {error && (
              <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-900">
                {error}
              </p>
            )}

            {url && (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border border-line bg-raised/40 px-2.5 py-1.5 text-[12px] text-fg outline-none focus:border-brand-400"
                />
                <button
                  onClick={copy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-700"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
