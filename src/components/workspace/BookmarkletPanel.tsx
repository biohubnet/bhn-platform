"use client";
/**
 * The "comment on the live page" installer.
 *
 * The bookmarklet is a one-liner that injects the overlay script from this
 * platform, so the behaviour can change server-side without anyone having
 * to reinstall the bookmark. It carries the review's share token, which is
 * what lets a colleague file a comment from biohubnet.ca without holding a
 * platform login.
 *
 * The href is written with setAttribute rather than the href prop because
 * React refuses to render `javascript:` URLs.
 */
import { useEffect, useRef, useState } from "react";
import { Bookmark, Copy, Check, ChevronDown } from "lucide-react";

export function snippetFor(shareToken: string, appOrigin: string): string {
  const src = `${appOrigin.replace(/\/$/, "")}/api/public/page-review/${shareToken}/overlay.js`;
  // Cache-bust so an updated overlay reaches people who installed it weeks ago.
  return (
    `javascript:(function(){var s=document.createElement('script');` +
    `s.src=${JSON.stringify(src)}+'?t='+Date.now();document.body.appendChild(s);})();`
  );
}

export function BookmarkletPanel({
  shareToken,
  url,
  appOrigin,
}: {
  shareToken: string;
  url: string;
  appOrigin: string;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const code = snippetFor(shareToken, appOrigin);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    linkRef.current?.setAttribute("href", code);
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setOpen(true); // fall back to letting them select it by hand
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-elevated/40 p-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <h3 className="text-sm font-bold text-fg inline-flex items-center gap-2">
            <Bookmark size={14} className="text-brand-600" /> Comment on the live page
          </h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Drag the button onto your bookmarks bar. Open{" "}
            <span className="font-medium text-fg">{url}</span>, click the bookmark, then click any
            element to comment on it. Colleagues don&apos;t need a platform login — the bookmark
            carries this review&apos;s token.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Not a Link: the href is a javascript: URL written in the effect above. */}
          <a
            ref={linkRef}
            draggable
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold cursor-grab active:cursor-grabbing select-none"
            title="Drag me to your bookmarks bar"
          >
            <Bookmark size={13} /> Review this page
          </a>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-card ring-1 ring-inset ring-line text-muted hover:text-fg"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-subtle hover:text-fg"
      >
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        Can&apos;t drag it?
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-muted">
            Make a new bookmark by hand, name it anything, and paste this as the address:
          </p>
          <code className="block text-[10px] font-mono text-subtle bg-card border border-line rounded-lg p-2.5 break-all leading-relaxed">
            {code}
          </code>
        </div>
      )}
    </section>
  );
}
