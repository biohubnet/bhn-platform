/**
 * Server-side accessor + writer for the active /login floater
 * config. Stored as JSON in the `loginFloaters` PlatformSetting
 * row (same key/value table the design-system selector uses).
 *
 * Defaults match the 5-floater layout the /login page shipped
 * with before this admin tool: AntibodyBinding top-left,
 * DnaTranscription lower-left, WesternBlotRun top-right,
 * CarTKill mid-right, MscCultureCycle bottom-right. If no
 * setting row exists OR the row's JSON is unparseable, return
 * the defaults so the login page never goes blank.
 *
 * Unknown floater ids (e.g. a registry entry that was renamed
 * or removed in a later deploy) are silently filtered out at
 * load — better to drop one floater than break the whole page.
 */

import { prisma } from "@/lib/prisma";
import { FLOATER_REGISTRY } from "./registry";
import type { FloaterInstance, LoginFloaterFx } from "./types";

const KEY = "loginFloaters";
const MAX_FLOATERS = 12;
// Global on/off flags for the two ambient layers. Stored in a SEPARATE
// PlatformSetting row from the floater array above so the existing list
// logic stays untouched. Both default ON; the login page also has a
// per-device override menu (effective visibility = global AND device).
const FX_KEY = "loginFloaterFx";
const DEFAULT_FX: LoginFloaterFx = { floatersEnabled: true, sparklesEnabled: true };

/** Default set — matches the hardcoded floaters the /login page
 *  used to render before this admin tool. Used as a fallback
 *  when no PlatformSetting row exists or it's corrupted. */
export const DEFAULT_FLOATERS: FloaterInstance[] = [
  {
    id: "antibody-binding",
    position: { side: "left", verticalPct: 8 },
    size: 140,
    colorClass: "text-emerald-300/30",
    swimClass: "lab-swim-rev",
  },
  {
    id: "dna-transcription",
    position: { side: "left", verticalPct: 55 },
    size: 220,
    colorClass: "text-sky-300/28",
    swimClass: "lab-swim-slow",
  },
  {
    id: "western-blot-run",
    position: { side: "right", verticalPct: 8 },
    size: 150,
    colorClass: "text-sky-200/28",
    swimClass: "lab-swim-slow",
  },
  {
    id: "car-t-kill",
    position: { side: "right", verticalPct: 38 },
    size: 160,
    colorClass: "text-rose-300/28",
    swimClass: "lab-swim-rev",
  },
  {
    id: "msc-culture-cycle",
    position: { side: "right", verticalPct: 80 },
    size: 200,
    colorClass: "text-slate-200/35",
    swimClass: "lab-swim-slow",
  },
];

export async function getActiveLoginFloaters(): Promise<FloaterInstance[]> {
  const row = await prisma.platformSetting
    .findUnique({ where: { key: KEY } })
    .catch(() => null);
  if (!row) return DEFAULT_FLOATERS;
  try {
    const parsed = JSON.parse(row.value);
    if (!Array.isArray(parsed)) return DEFAULT_FLOATERS;
    const validated = parsed
      .filter((f: unknown): f is FloaterInstance => {
        if (typeof f !== "object" || f === null) return false;
        const o = f as Record<string, unknown>;
        if (typeof o.id !== "string") return false;
        if (!FLOATER_REGISTRY[o.id]) return false;
        if (typeof o.position !== "object" || o.position === null) return false;
        const p = o.position as Record<string, unknown>;
        if (p.side !== "left" && p.side !== "right") return false;
        if (typeof p.verticalPct !== "number") return false;
        return true;
      })
      .slice(0, MAX_FLOATERS);
    return validated;
  } catch {
    return DEFAULT_FLOATERS;
  }
}

/** Persist the admin's new floater list. Validates against the
 *  registry, clamps the list to MAX_FLOATERS, and upserts the
 *  PlatformSetting row. Returns the validated list that was
 *  actually written. */
export async function setActiveLoginFloaters(
  list: FloaterInstance[],
): Promise<FloaterInstance[]> {
  const validated = list
    .filter((f) => typeof f.id === "string" && !!FLOATER_REGISTRY[f.id])
    .filter(
      (f) =>
        f.position &&
        (f.position.side === "left" || f.position.side === "right") &&
        typeof f.position.verticalPct === "number",
    )
    .map((f) => ({
      id: f.id,
      position: {
        side: f.position.side,
        // Clamp 0–100 so a typo can't push a floater off-screen.
        verticalPct: Math.max(0, Math.min(100, Math.round(f.position.verticalPct))),
      },
      // Clamp size to a sensible 50..400 range.
      size:
        typeof f.size === "number" ? Math.max(50, Math.min(400, Math.round(f.size))) : undefined,
      colorClass: typeof f.colorClass === "string" ? f.colorClass.slice(0, 80) : undefined,
      swimClass: typeof f.swimClass === "string" ? f.swimClass.slice(0, 40) : undefined,
    }))
    .slice(0, MAX_FLOATERS);

  await prisma.platformSetting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(validated) },
    create: { key: KEY, value: JSON.stringify(validated) },
  });

  return validated;
}

/** Reset the admin's saved config back to DEFAULT_FLOATERS. Used
 *  by the "Reset to defaults" button on the admin page. */
export async function resetLoginFloatersToDefaults(): Promise<FloaterInstance[]> {
  return setActiveLoginFloaters(DEFAULT_FLOATERS);
}

/** Read the platform-wide ambient-layer flags. Missing or corrupt row
 *  → both default ON, so the login page never silently goes dark. */
export async function getLoginFloaterFx(): Promise<LoginFloaterFx> {
  const row = await prisma.platformSetting
    .findUnique({ where: { key: FX_KEY } })
    .catch(() => null);
  if (!row) return { ...DEFAULT_FX };
  try {
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    return {
      floatersEnabled:
        typeof parsed?.floatersEnabled === "boolean" ? parsed.floatersEnabled : true,
      sparklesEnabled:
        typeof parsed?.sparklesEnabled === "boolean" ? parsed.sparklesEnabled : true,
    };
  } catch {
    return { ...DEFAULT_FX };
  }
}

/** Patch the ambient-layer flags (partial — only the keys present are
 *  changed). Returns the full, persisted flag set. */
export async function setLoginFloaterFx(
  patch: Partial<LoginFloaterFx>,
): Promise<LoginFloaterFx> {
  const current = await getLoginFloaterFx();
  const next: LoginFloaterFx = {
    floatersEnabled:
      typeof patch.floatersEnabled === "boolean" ? patch.floatersEnabled : current.floatersEnabled,
    sparklesEnabled:
      typeof patch.sparklesEnabled === "boolean" ? patch.sparklesEnabled : current.sparklesEnabled,
  };
  await prisma.platformSetting.upsert({
    where: { key: FX_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: FX_KEY, value: JSON.stringify(next) },
  });
  return next;
}
