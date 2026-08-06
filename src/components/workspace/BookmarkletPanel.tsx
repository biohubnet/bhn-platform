"use client";
/** Direct review access for BioHubNet, with the bookmarklet as a fallback. */
import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, Copy, ExternalLink, Link2 } from "lucide-react";

export function snippetFor(shareToken: string, appOrigin: string, viewerCredential: string): string {
  const src = `${appOrigin.replace(/\/$/, "")}/api/public/page-review/${shareToken}/overlay.js`;
  // Cache-bust so an updated overlay reaches people who installed it weeks ago.
  return (
    `javascript:(function(){var s=document.createElement('script');` +
    `s.src=${JSON.stringify(src)}+'?t='+Date.now();` +
    `s.dataset.viewer=${JSON.stringify(viewerCredential)};document.body.appendChild(s);})();`
  );
}

export function BookmarkletPanel({
  shareToken,
  reviewId,
  url,
  appOrigin,
  viewerCredential,
}: {
  shareToken: string;
  reviewId: string;
  url: string;
  appOrigin: string;
  viewerCredential: string;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const code = snippetFor(shareToken, appOrigin, viewerCredential);
  const reviewLink = `${appOrigin}/api/workspace/page-review/${encodeURIComponent(reviewId)}/launch`;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"review" | "bookmarklet" | null>(null);

  useEffect(() => {
    linkRef.current?.setAttribute("href", code);
  }, [code]);

  async function copy(value: string, kind: "review" | "bookmarklet") {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-fg inline-flex items-center gap-2">
            <Link2 size={14} className="text-brand-600" /> Review on the live page
          </h3>
          <p className="text-xs text-muted mt-1 truncate max-w-2xl" title={url}>{url}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={reviewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700"
          >
            <ExternalLink size={13} /> Open review page
          </a>
          <button
            type="button"
            onClick={() => copy(reviewLink, "review")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-elevated ring-1 ring-inset ring-line text-muted hover:text-fg"
          >
            {copied === "review" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            {copied === "review" ? "Copied" : "Copy review link"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-subtle hover:text-fg"
      >
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        Bookmarklet fallback
      </button>
      {open && (
        <div className="mt-3 border-t border-line pt-3 space-y-3">
          <p className="text-[11px] text-muted">
            This personal bookmarklet is for pages without the BioHubNet review loader.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* React blocks javascript: href props, so the effect writes this URL directly. */}
            <a
              ref={linkRef}
              draggable
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-elevated ring-1 ring-inset ring-line text-xs font-semibold text-fg cursor-grab active:cursor-grabbing select-none"
              title="Drag to the bookmarks bar"
            >
              <Bookmark size={12} /> Review this page
            </a>
            <button
              type="button"
              onClick={() => copy(code, "bookmarklet")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-fg"
            >
              {copied === "bookmarklet" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copied === "bookmarklet" ? "Copied" : "Copy bookmarklet"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
