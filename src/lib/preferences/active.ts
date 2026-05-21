/**
 * Resolves a user's effective feature preferences.
 *
 * The User.featurePrefs JSON column stores only the user's diffs
 * vs the defaults — { hidden: string[], order: string[] }. This
 * module folds those diffs against the registry so callers get a
 * stable normalised shape.
 *
 *   • `hidden` — explicit feature ids the user has toggled off.
 *     Items not in here AND not registered with `defaultEnabled: false`
 *     are visible.
 *   • `order`  — explicit ordering. Ids not in the array fall to
 *     the registry's natural order at the end of their group.
 *
 * The sidebar (and any other surface that respects user prefs)
 * calls `getEffectivePrefs(userId)` once at render time and uses
 * the result to filter + reorder its nav items.
 */
import { prisma } from "@/lib/prisma";
import {
  FEATURES, FEATURES_BY_ID, MINIMAL_PRESET, DEFAULT_PRESET, FULL_PRESET,
} from "./registry";

export interface FeaturePrefs {
  hidden: string[];
  order: string[];
}

export interface EffectivePrefs {
  /** Set of feature ids the user has hidden. Membership check is the
   *  hot path — sidebar checks this for every NavItem on every
   *  server render. */
  hiddenSet: Set<string>;
  /** Explicit user ordering; ids not in here use registry order. */
  order: string[];
  /** Raw stored prefs (for the switchboard to read + display). */
  raw: FeaturePrefs;
}

/** Parse a raw User.featurePrefs JSON column into a normalised shape.
 *  Tolerant of malformed JSON / missing fields / unknown ids — the
 *  worst case is the user sees the default sidebar, which is safe. */
export function parsePrefs(raw: unknown): FeaturePrefs {
  if (!raw || typeof raw !== "object") return { hidden: [], order: [] };
  const obj = raw as Record<string, unknown>;
  const hidden = Array.isArray(obj.hidden)
    ? obj.hidden.filter((s): s is string => typeof s === "string")
    : [];
  const order = Array.isArray(obj.order)
    ? obj.order.filter((s): s is string => typeof s === "string")
    : [];
  return { hidden, order };
}

/** Compute the user's effective prefs. Reads the row once. */
export async function getEffectivePrefs(userId: string): Promise<EffectivePrefs> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { featurePrefs: true },
  });
  const raw = parsePrefs(user?.featurePrefs);
  return foldEffective(raw);
}

/** Pure version — used by the switchboard page which has the raw
 *  JSON in hand from its own server-side fetch. */
export function foldEffective(raw: FeaturePrefs): EffectivePrefs {
  // Start from registry defaults — every feature whose
  // `defaultEnabled` is false is implicitly hidden unless the user
  // has explicitly added it back.
  const implicitHidden = new Set<string>();
  for (const f of FEATURES) {
    if (!f.defaultEnabled) implicitHidden.add(f.id);
  }
  // Apply the user's explicit overrides — anything in `hidden` is
  // hidden; anything NOT in `hidden` but ALSO not in `implicitHidden`
  // is shown. The user can re-enable a default-off feature simply
  // by NOT having it in `hidden` — we treat the order array's
  // presence as the opt-in signal: if a default-off feature appears
  // in `order`, the user has explicitly placed it, so it shouldn't
  // be implicitly hidden.
  const orderedSet = new Set(raw.order);
  const hiddenSet = new Set<string>();
  for (const id of implicitHidden) {
    if (!orderedSet.has(id)) hiddenSet.add(id);
  }
  for (const id of raw.hidden) hiddenSet.add(id);
  // Don't keep ids that the registry doesn't know about.
  for (const id of Array.from(hiddenSet)) {
    if (!FEATURES_BY_ID.has(id)) hiddenSet.delete(id);
  }
  return { hiddenSet, order: raw.order, raw };
}

/** Persist a fresh prefs blob. Caller passes the partial fields
 *  (hidden / order); we merge into whatever's stored already. */
export async function savePrefs(userId: string, patch: Partial<FeaturePrefs>): Promise<FeaturePrefs> {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { featurePrefs: true },
  });
  const merged: FeaturePrefs = {
    ...parsePrefs(current?.featurePrefs),
    ...patch,
  };
  // Clamp to registered ids only — never persist garbage that would
  // dirty the JSON column over time as features churn.
  merged.hidden = merged.hidden.filter((id) => FEATURES_BY_ID.has(id));
  merged.order = merged.order.filter((id) => FEATURES_BY_ID.has(id));
  await prisma.user.update({
    where: { id: userId },
    data: { featurePrefs: merged as unknown as object },
  });
  return merged;
}

/** Replace the user's prefs wholesale with a preset. */
export type PresetName = "minimal" | "default" | "full";

export async function applyPreset(userId: string, preset: PresetName): Promise<FeaturePrefs> {
  const visible = preset === "minimal" ? MINIMAL_PRESET
    : preset === "default" ? DEFAULT_PRESET
    : FULL_PRESET;
  // hidden = everything in the registry NOT in the visible set.
  // For Default we trust the registry's defaultEnabled flag (so
  // default-off features stay off without needing to be in `hidden`),
  // so we pass an empty hidden + empty order — foldEffective then
  // hides everything default-off naturally.
  let hidden: string[] = [];
  const order: string[] = [];
  if (preset !== "default") {
    hidden = FEATURES
      .filter((f) => !visible.has(f.id))
      .map((f) => f.id);
    // For non-default presets we also keep `order` containing every
    // visible id — that signals "the user has explicitly opted into
    // these" so default-off items they wanted (in Full preset) stay on.
    for (const id of visible) order.push(id);
  }
  return savePrefs(userId, { hidden, order });
}
