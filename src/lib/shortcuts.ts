/**
 * Shared definitions for the platform keyboard-shortcut layer.
 *
 * Bindings live in localStorage (`bhn.shortcuts.v1`) so each device
 * keeps its own mapping. The defaults are the BHN-recommended set;
 * users can rebind any action from /profile/shortcuts.
 *
 * Why localStorage and not the User table? Bindings are inherently
 * device-local (a desk Mac, a laptop, a tablet all want different
 * comfort defaults), they're trivial to recreate, and storing them
 * server-side would cost a DB round-trip on every page load for a
 * preference that almost never changes. If we ever cross-sync them
 * we can hydrate from localStorage and lazy-sync to a server row.
 */

export type ShortcutAction =
  | "toggleRole"
  | "shortcutsHelp"
  | "goDashboard"
  | "goCourses"
  | "goMyCourses"
  | "goEvents";

export interface ShortcutMap {
  toggleRole: string;
  shortcutsHelp: string;
  goDashboard: string;
  goCourses: string;
  goMyCourses: string;
  goEvents: string;
}

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  toggleRole:    "x", // X — flip between real role and trainee view (admin / superadmin)
  shortcutsHelp: "?", // ? — open the shortcut cheat-sheet overlay
  goDashboard:   "1", // 1 — jump to /dashboard
  goCourses:     "2", // 2 — jump to /courses
  goMyCourses:   "3", // 3 — jump to /my-courses
  goEvents:      "4", // 4 — jump to /events
};

export interface ShortcutDef {
  action: ShortcutAction;
  label: string;
  description: string;
  /** Roles that can use the action — undefined means "everyone". */
  roleGate?: "staff";
}

export const SHORTCUT_CATALOG: ShortcutDef[] = [
  { action: "toggleRole",    label: "Quick role-toggle",     description: "Single tap: flip trainee view on/off. Double tap (same key twice fast): flip HR / employer view on/off, or escape any view-as back to your real seat. Admin / superadmin only.", roleGate: "staff" },
  { action: "shortcutsHelp", label: "Show shortcut cheat-sheet", description: "Pop up an overlay listing every active shortcut." },
  { action: "goDashboard",   label: "Go to · Dashboard",     description: "Jump to /dashboard from anywhere." },
  { action: "goCourses",     label: "Go to · Catalog",       description: "Jump to /courses (the course catalog)." },
  { action: "goMyCourses",   label: "Go to · My Courses",    description: "Jump to /my-courses (your enrolments)." },
  { action: "goEvents",      label: "Go to · Events",        description: "Jump to /events." },
];

export const STORAGE_KEY = "bhn.shortcuts.v1";

export function loadShortcuts(): ShortcutMap {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(raw) as Partial<ShortcutMap>;
    return { ...DEFAULT_SHORTCUTS, ...parsed };
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(m: ShortcutMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  window.dispatchEvent(new CustomEvent("bhn:shortcuts-updated"));
}
