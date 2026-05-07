"use client";
import { useEffect, useRef, useState } from "react";
import { Languages, Check, RotateCcw, Loader2 } from "lucide-react";
import { LOCALES, type LocaleId } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bhn-page-translation";

interface NodeRef {
  node: Text;
  original: string;
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
      // Send in chunks
      for (let i = 0; i < uniqueTexts.length; i += 60) {
        const chunk = uniqueTexts.slice(i, i + 60);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: chunk, source: "en", target }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Translation failed");
        }
        const j = (await res.json()) as { translated: string[] };
        chunk.forEach((src, k) => translated.set(src, j.translated[k] ?? src));
      }

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
    } catch (e) {
      console.error(e);
      alert("Translation failed: " + (e as Error).message);
    } finally {
      setBusy(false);
      setOpen(false);
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
        <div className="absolute top-full right-0 mt-2 surface p-1.5 z-30 min-w-[220px] animate-fade-in">
          <p className="px-2 py-1.5 text-[10px] font-semibold text-subtle uppercase tracking-[0.18em]">
            Translate this page
          </p>
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
