"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Keyboard } from "lucide-react";
import {
  ShortcutMap,
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATALOG,
  loadShortcuts,
  STORAGE_KEY,
} from "@/lib/shortcuts";

/**
 * Document-level keyboard handler.
 *
 * Mounted once in the dashboard chrome. Listens for keydown, looks
 * the pressed key up in the user's binding map, and fires the
 * matching action. Inputs / textareas / contenteditable / modifier
 * combos are ignored so the shortcuts don't fight ordinary typing.
 *
 * The catalog of supported actions lives in `src/lib/shortcuts.ts`
 * so the settings page and this component agree on the universe of
 * rebindable things.
 */
interface Props {
  realRole?: string;
  actingAs?: string | null;
}

export function KeyboardShortcuts({ realRole, actingAs }: Props) {
  const router = useRouter();
  const [map, setMap] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  const [showHelp, setShowHelp] = useState(false);

  const canActAs = realRole === "admin" || realRole === "superadmin";

  // Re-read bindings on mount AND whenever the settings page edits them.
  useEffect(() => {
    setMap(loadShortcuts());
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setMap(loadShortcuts());
    }
    function onUpdate() { setMap(loadShortcuts()); }
    window.addEventListener("storage", onStorage);
    window.addEventListener("bhn:shortcuts-updated", onUpdate as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("bhn:shortcuts-updated", onUpdate as EventListener);
    };
  }, []);

  const toggleRole = useCallback(async () => {
    if (!canActAs) return;
    try {
      if (actingAs) {
        await fetch("/api/admin/act-as", { method: "DELETE" });
      } else {
        await fetch("/api/admin/act-as", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "trainee" }),
        });
      }
      router.refresh();
    } catch {
      // swallow — the user will see the role unchanged and retry
    }
  }, [canActAs, actingAs, router]);

  useEffect(() => {
    function isEditable(t: EventTarget | null): boolean {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      return !!el.isContentEditable;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      const k = e.key;
      const kLower = k.toLowerCase();

      if (kLower === map.toggleRole.toLowerCase()) {
        if (!canActAs) return;
        e.preventDefault();
        void toggleRole();
        return;
      }
      if (k === map.shortcutsHelp) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (kLower === map.goDashboard.toLowerCase()) { e.preventDefault(); router.push("/dashboard"); return; }
      if (kLower === map.goCourses.toLowerCase())   { e.preventDefault(); router.push("/courses");   return; }
      if (kLower === map.goMyCourses.toLowerCase()) { e.preventDefault(); router.push("/my-courses"); return; }
      if (kLower === map.goEvents.toLowerCase())    { e.preventDefault(); router.push("/events");    return; }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [map, canActAs, toggleRole, router]);

  return (
    <>
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="max-w-lg w-full bg-card rounded-2xl border border-line shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex w-9 h-9 rounded-xl bg-brand-600 text-white items-center justify-center">
                  <Keyboard size={16} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-fg">Keyboard shortcuts</h3>
                  <p className="text-xs text-muted">
                    Rebind any of these at{" "}
                    <Link
                      href="/profile/shortcuts"
                      className="text-brand-700 font-medium hover:underline"
                      onClick={() => setShowHelp(false)}
                    >
                      Profile · Shortcuts
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-elevated"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            <ul className="space-y-1.5">
              {SHORTCUT_CATALOG.filter((d) => !(d.roleGate === "staff" && !canActAs)).map((d) => (
                <li key={d.action} className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-elevated">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg leading-tight">{d.label}</p>
                    <p className="text-xs text-muted leading-tight mt-0.5">{d.description}</p>
                  </div>
                  <kbd className="shrink-0 text-[11px] font-bold px-2 py-1 rounded bg-elevated ring-1 ring-inset ring-line text-fg uppercase tracking-wider">
                    {String(map[d.action])}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
