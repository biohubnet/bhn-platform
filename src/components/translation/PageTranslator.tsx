"use client";
import { useEffect, useRef, useState } from "react";
import { Languages, Check, RotateCcw, Loader2 } from "lucide-react";
import { LOCALES, type LocaleId } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bhn-page-translation";
const CACHE_KEY_PREFIX = "bhn-tr-cache:";

interface NodeRef {
  node: Text;
  original: string;
}

// In-tab translation cache. We mirror the server's persistent cache so
// repeated navigations within a tab don't even hit the network. Keyed by
// target language; values are { [originalText]: translatedText } maps.
function loadCache(target: string): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + target);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveCache(target: string, cache: Record<string, string>) {
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + target, JSON.stringify(cache));
  } catch {
    // sessionStorage full or disabled — non-fatal, just lose the cache.
  }
}

/**
 * Walks the DOM under <main> (the dashboard content area), collects
 * meaningful text nodes, sends them to /api/translate in one batch,
 * and replaces nodeValue in place. Stores originals so the user can
 * revert. Survives basic navigation by re-running on pathname change.
 *
 * Skipped nodes:
 *   - Inside <script>, <style>, <code>, <pre>, <input>, <textarea>, <noscript>
 *   - Pure whitespace, punctuation, or numeric strings
 *   - Already-translated nodes (marked with data-bhn-translated)
 */
export function PageTranslator() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<LocaleId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const refsRef = useRef<NodeRef[]>([]);

  // Restore previous selection on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY) as LocaleId | null;
      if (saved && LOCALES.some((l) => l.id === saved) && saved !== "en") {
        // Defer slightly so the page renders first
        setTimeout(() => translatePage(saved), 600);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function collectTextNodes(): NodeRef[] {
    const root = document.querySelector("main") ?? document.body;
    if (!root) return [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n: Node) {
        const text = (n.nodeValue ?? "").trim();
        if (text.length < 2) return NodeFilter.FILTER_REJECT;
        if (/^[\d\s\W_]+$/.test(text)) return NodeFilter.FILTER_REJECT;
        const parent = n.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        // Skip styling-only / structural / interactive elements
        const tag = parent.tagName;
        if (["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT", "NOSCRIPT", "SVG"].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.hasAttribute("data-no-translate")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: NodeRef[] = [];
    let cur = walker.nextNode();
    while (cur) {
      nodes.push({ node: cur as Text, original: cur.nodeValue ?? "" });
      cur = walker.nextNode();
    }
    return nodes;
  }

  async function translatePage(target: LocaleId) {
    if (target === "en") {
      revert();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Restore originals first if we already translated to a different lang
      if (refsRef.current.length > 0) revertOnly();
      const refs = collectTextNodes();
      refsRef.current = refs;
      // Dedupe identical strings → translate once
      const seen = new Map<string, number[]>();
      refs.forEach((r, i) => {
        const key = r.original;
        const list = seen.get(key);
        if (list) list.push(i);
        else seen.set(key, [i]);
      });

      const uniqueTexts = Array.from(seen.keys());
      const translated = new Map<string, string>();

      // First pass: serve from sessionStorage cache so re-mounts and
      // repeat-visit pages don't re-fetch unchanged strings.
      const cache = loadCache(target);
      const toFetch: string[] = [];
      for (const t of uniqueTexts) {
        const hit = cache[t];
        if (hit !== undefined) translated.set(t, hit);
        else toFetch.push(t);
      }

      // Send misses in chunks. The server has its own persistent cache
      // backing this, so even a fresh tab usually skips Cloudflare.
      for (let i = 0; i < toFetch.length; i += 60) {
        const chunk = toFetch.slice(i, i + 60);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: chunk, source: "en", target }),
        });
        if (!res.ok) {
          // Surface the real server response so we can diagnose. The
          // body may not be JSON (e.g. Next's HTML error page on 500).
          const raw = await res.text().catch(() => "");
          let detail = `HTTP ${res.status}`;
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.error) detail = parsed.error;
          } catch {
            if (raw) detail += ` — ${raw.slice(0, 140).replace(/\s+/g, " ")}`;
          }
          throw new Error(detail);
        }
        const j = (await res.json()) as { translated: string[] };
        chunk.forEach((src, k) => {
          const out = j.translated[k] ?? src;
          translated.set(src, out);
          cache[src] = out;
        });
      }
      if (toFetch.length > 0) saveCache(target, cache);

      for (const r of refs) {
        const t = translated.get(r.original);
        if (t && t !== r.original) {
          // Mark parent so we don't double-translate
          r.node.parentElement?.setAttribute("data-bhn-translated", "1");
          r.node.nodeValue = t;
        }
      }
      setActive(target);
      try { sessionStorage.setItem(STORAGE_KEY, target); } catch {}
      setOpen(false);
    } catch (e) {
      console.error(e);
      // Clear the saved language so we don't auto-retry on every page
      // mount — that's what made the alert feel like it wouldn't close.
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
      refsRef.current = [];
      setError((e as Error).message || "Translation failed");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  function revertOnly() {
    for (const r of refsRef.current) {
      r.node.nodeValue = r.original;
      r.node.parentElement?.removeAttribute("data-bhn-translated");
    }
    refsRef.current = [];
  }

  function revert() {
    revertOnly();
    setActive(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setOpen(false);
  }

  const activeLocale = active ? LOCALES.find((l) => l.id === active) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
          active
            ? "bg-brand-50 text-brand-700"
            : "hover:bg-elevated text-muted hover:text-fg"
        )}
        title="Translate this page"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
        <span className="text-xs font-medium">
          {active ? activeLocale?.nativeName : "Translate"}
        </span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 popover p-1.5 z-30 min-w-[220px] animate-fade-in">
          <p className="px-2 py-1.5 text-[10px] font-semibold text-subtle uppercase tracking-[0.18em]">
            Translate this page
          </p>
          {error && (
            <div className="mx-1 mb-1 px-2 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-[11px] leading-snug">
              <div className="flex items-start justify-between gap-2">
                <span className="break-words">{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-500 hover:text-rose-700 text-base leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          <div className="space-y-0.5">
            {LOCALES.filter((l) => l.id !== "en").map((l) => {
              const isActive = active === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => translatePage(l.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors text-sm",
                    isActive ? "bg-brand-50 text-brand-700" : "hover:bg-elevated text-fg"
                  )}
                >
                  <span className="flex-1">{l.nativeName} <span className="text-subtle text-xs">({l.name})</span></span>
                  {isActive && <Check size={13} className="text-brand-600" />}
                </button>
              );
            })}
          </div>
          {active && (
            <div className="mt-1 pt-1 border-t border-line">
              <button
                onClick={revert}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm text-muted hover:bg-elevated hover:text-fg"
              >
                <RotateCcw size={13} /> Show original
              </button>
            </div>
          )}
          <p className="px-2 pt-2 text-[10px] text-subtle leading-snug">
            Powered by Cloudflare m2m100 — quality varies; technical terms may be loose.
          </p>
        </div>
      )}
    </div>
  );
}
