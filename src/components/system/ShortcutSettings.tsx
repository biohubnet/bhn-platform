"use client";
import { useEffect, useState } from "react";
import { Keyboard, RotateCcw, Check } from "lucide-react";
import {
  ShortcutAction,
  ShortcutMap,
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATALOG,
  loadShortcuts,
  saveShortcuts,
} from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

/**
 * Per-action editor for the keyboard-shortcut map. Click a row's
 * "Rebind" button, then press any single non-modifier key to assign
 * it. Esc cancels. Duplicate detection runs after every change so
 * the user can see (and resolve) collisions.
 *
 * We deliberately avoid chorded shortcuts (Cmd+K, Shift+G) at this
 * tier — the rest of the platform plus the browser already use most
 * of those, and single-letter shortcuts read more naturally in a
 * cheat-sheet anyway. Power users wanting Cmd-style shortcuts have
 * the command palette to fall back on.
 */
export function ShortcutSettings({ realRole }: { realRole: string }) {
  const [map, setMap] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  const [editing, setEditing] = useState<ShortcutAction | null>(null);
  const [saved, setSaved] = useState(false);

  const canActAs = realRole === "admin" || realRole === "superadmin";
  const visible = SHORTCUT_CATALOG.filter((d) => !(d.roleGate === "staff" && !canActAs));

  useEffect(() => { setMap(loadShortcuts()); }, []);

  useEffect(() => {
    if (!editing) return;
    // Snapshot the action in scope so TypeScript can narrow it inside
    // the listener (the `editing` state could change while the handler
    // is queued, but for our purposes the snapshot is authoritative).
    const target: ShortcutAction = editing;
    function isModifier(k: string) {
      return ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Enter"].includes(k);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setEditing(null); return; }
      if (isModifier(e.key)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return; // chorded keys disallowed
      e.preventDefault();
      e.stopPropagation();
      const next: ShortcutMap = { ...map, [target]: e.key };
      setMap(next);
      saveShortcuts(next);
      setEditing(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [editing, map]);

  function reset() {
    setMap(DEFAULT_SHORTCUTS);
    saveShortcuts(DEFAULT_SHORTCUTS);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  // Highlight any binding that's shared with another visible action.
  const counts = new Map<string, number>();
  for (const d of visible) {
    const v = map[d.action].toLowerCase();
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-1.5">
        <ul className="divide-y divide-line">
          {visible.map((d) => {
            const value = map[d.action];
            const collides = (counts.get(value.toLowerCase()) ?? 0) > 1;
            const isEditing = editing === d.action;
            return (
              <li key={d.action} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg leading-tight">{d.label}</p>
                  <p className="text-xs text-muted leading-tight mt-0.5">{d.description}</p>
                  {collides && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Same key as another action — only one will fire.
                    </p>
                  )}
                </div>
                {isEditing ? (
                  <span className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 animate-pulse">
                    Press any key… (Esc to cancel)
                  </span>
                ) : (
                  <>
                    <kbd className={cn(
                      "shrink-0 text-[11px] font-bold px-2 py-1 rounded ring-1 ring-inset uppercase tracking-wider",
                      collides ? "bg-amber-50 ring-amber-300 text-amber-800" : "bg-elevated ring-line text-fg",
                    )}>
                      {value}
                    </kbd>
                    <button
                      type="button"
                      onClick={() => setEditing(d.action)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 ring-1 ring-inset ring-brand-200 transition-colors"
                    >
                      Rebind
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          <RotateCcw size={12} />
          Reset to defaults
        </button>
        <p className="text-xs text-subtle inline-flex items-center gap-1.5">
          {saved ? (
            <><Check size={12} className="text-emerald-600" /> Saved on this device</>
          ) : (
            <><Keyboard size={12} /> Bindings live on this device only</>
          )}
        </p>
      </div>
    </div>
  );
}
