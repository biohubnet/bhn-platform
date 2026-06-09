"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
import {
  dispatchRoleSwitchStart,
  dispatchRoleSwitchDone,
} from "@/components/system/RoleSwitchOverlay";

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

  // Friendly labels for the overlay, so the user sees "Trainee" not
  // "trainee" while the role switch is in flight. Mirrors the
  // labels in RoleSwitcher's TARGETS list. Extended Dec '26 to
  // include every role the user can be coming FROM so the overlay
  // can show "Trainee → Employer HR" with both ends humanised.
  const ROLE_LABEL: Record<string, string> = {
    trainee:              "Trainee",
    evaluating:           "Evaluating",
    employer:             "Employer HR",
    hr:                   "HR",
    industrial_mentor:    "Industrial Mentor",
    engage_hqp_advisor:   "ENGAGE HQP Advisor",
    equip_grant_reviewer: "EQUIP Grant Reviewer",
    instructor:           "Instructor",
    admin:                "Admin",
    superadmin:           "Superadmin",
    real:                 "your real seat",
  };

  // Resolve the FROM label — the role the user is currently in.
  // When actingAs is null they're at their real seat (could be
  // admin or superadmin); we use realRole if known, else the
  // generic "your real seat" copy.
  function fromLabel(): string {
    if (actingAs) return ROLE_LABEL[actingAs] ?? actingAs;
    if (realRole) return ROLE_LABEL[realRole] ?? realRole;
    return "your real seat";
  }

  // Single press of the role-toggle key — flips trainee on/off.
  //   • acting as trainee  → clear, return to real seat
  //   • anything else      → switch to trainee
  const fireSingleToggleRole = useCallback(async () => {
    if (!canActAs) return;
    const target = actingAs === "trainee" ? "real" : "trainee";
    dispatchRoleSwitchStart(fromLabel(), ROLE_LABEL[target] ?? target);
    try {
      if (actingAs === "trainee") {
        await fetch("/api/admin/act-as", { method: "DELETE" });
      } else {
        await fetch("/api/admin/act-as", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "trainee" }),
        });
      }
      router.refresh();
      // router.refresh() is fire-and-forget; we don't have a promise
      // to await. Fire the done event after a tick so the overlay
      // clears once the new HTML lands (the actingAs-watching effect
      // also clears it).
      dispatchRoleSwitchDone();
    } catch {
      // swallow — the user will see the role unchanged and retry
      dispatchRoleSwitchDone();
    }
    // ROLE_LABEL is a module-level constant in spirit; safe to
    // omit from deps. canActAs / actingAs / router covered below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canActAs, actingAs, router]);

  // Double-tap of the role-toggle key — flips HR on, or escapes to
  // real seat from any active view-as.
  //   • acting as anything (trainee or employer) → clear to real
  //   • real seat → switch to employer / HR
  // Net effect: superadmin -xx-> HR, HR -x-> trainee, trainee -xx->
  // back to real (the sequence the request described).
  const fireDoubleToggleRole = useCallback(async () => {
    if (!canActAs) return;
    const target = actingAs ? "real" : "employer";
    dispatchRoleSwitchStart(fromLabel(), ROLE_LABEL[target] ?? target);
    try {
      if (actingAs) {
        await fetch("/api/admin/act-as", { method: "DELETE" });
      } else {
        await fetch("/api/admin/act-as", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "employer" }),
        });
      }
      router.refresh();
      dispatchRoleSwitchDone();
    } catch {
      // swallow
      dispatchRoleSwitchDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canActAs, actingAs, router]);

  // Double-tap detection for the role key. We delay the single-tap
  // action by DOUBLE_TAP_WINDOW_MS so a fast second press can promote
  // the press to a double-tap without firing the single-tap first
  // (which would otherwise cause a flicker — switch to trainee, then
  // immediately switch to HR). Reduced from 320 ms → 220 ms because
  // the overlay now reassures the user that the switch is happening,
  // so we want single-tap to feel as snappy as possible.
  const DOUBLE_TAP_WINDOW_MS = 220;
  const xPendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function isEditable(e: KeyboardEvent): boolean {
      // Walk the composed path, not just e.target, so we also catch fields
      // inside a Shadow DOM (e.g. the workspace script editor) — there
      // e.target is only the shadow host, which hides the real input and
      // would let plain typing (like "x") trigger global shortcuts.
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const nodes: EventTarget[] = path.length ? path : e.target ? [e.target] : [];
      for (const n of nodes) {
        const el = n as HTMLElement | null;
        if (!el || el.nodeType !== 1) continue;
        const tag = el.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return true;
        if (el.isContentEditable) return true;
      }
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e)) return;
      const k = e.key;
      const kLower = k.toLowerCase();

      if (kLower === map.toggleRole.toLowerCase()) {
        if (!canActAs) return;
        e.preventDefault();
        if (xPendingTimer.current) {
          // Second press inside the double-tap window — cancel the
          // queued single action and fire the double action instead.
          clearTimeout(xPendingTimer.current);
          xPendingTimer.current = null;
          void fireDoubleToggleRole();
        } else {
          // First press — queue the single action. If a second press
          // lands within the window the timer is cleared above.
          xPendingTimer.current = setTimeout(() => {
            xPendingTimer.current = null;
            void fireSingleToggleRole();
          }, DOUBLE_TAP_WINDOW_MS);
        }
        return;
      }
      if (k === map.shortcutsHelp) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      // The 1 / 2 / 3 / 4 number-key navigation shortcuts were retired
      // because they fought ordinary number entry (years, GPAs,
      // versions, dates). Re-add via /profile/shortcuts if you want
      // them back on your own device.
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (xPendingTimer.current) {
        clearTimeout(xPendingTimer.current);
        xPendingTimer.current = null;
      }
    };
  }, [map, canActAs, fireSingleToggleRole, fireDoubleToggleRole, router]);

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
              {SHORTCUT_CATALOG.filter((d) => !(d.roleGate === "staff" && !canActAs)).map((d) => {
                const key = String(map[d.action]);
                const isRoleToggle = d.action === "toggleRole";
                return (
                  <li key={d.action} className="flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-elevated">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-fg leading-tight">{d.label}</p>
                      <p className="text-xs text-muted leading-tight mt-0.5">{d.description}</p>
                      {isRoleToggle && (
                        <p className="text-xs text-brand-700 leading-tight mt-1">
                          Double-tap{" "}
                          <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 ring-1 ring-inset ring-brand-200">
                            {key}{key}
                          </kbd>{" "}
                          → switch to HR / employer view (or back to your real seat).
                        </p>
                      )}
                    </div>
                    <kbd className="shrink-0 text-[11px] font-bold px-2 py-1 rounded bg-elevated ring-1 ring-inset ring-line text-fg uppercase tracking-wider">
                      {key}
                    </kbd>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
