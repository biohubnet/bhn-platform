/**
 * Server-side accessor for runtime-tunable platform settings.
 *
 * Settings live in the `PlatformSetting` table (key/value, both strings)
 * and are edited from /admin/settings. This module gives the rest of the
 * code a typed getter per key so callers don't all duplicate the
 * "read row, parse int, fall back to default" boilerplate — and so the
 * default is named and discoverable, not buried inline at the call site.
 *
 * Keep the surface small: only expose a getter per setting that's
 * actually consumed by code at request time. UI-only defaults
 * (siteName, logoUrl, etc.) belong in the admin page's DEFAULT_SETTINGS
 * map and don't need a wrapper here.
 */
import { prisma } from "@/lib/prisma";
import { sanitizeOverrides, type TokenOverrides } from "@/lib/design-tokens/registry";
import {
  DEFAULT_DESIGN_SYSTEM,
  isValidDesignSystem,
  type DesignSystemId,
} from "@/lib/design-system/registry";

const DEFAULT_TRAINEE_COURSE_LIMIT = 3;

const DESIGN_SYSTEM_KEY = "activeDesignSystem";

/**
 * The active design system. Admin-managed via /admin/design-system —
 * the same id is applied to every user of the platform (it's not a
 * per-user toggle). Falls back to DEFAULT_DESIGN_SYSTEM (Classic) on
 * missing row, parse failure, or DB miss so the platform always
 * boots into a known-good UI.
 *
 * Called from the root layout on every request — single PK lookup,
 * well under a millisecond.
 */
export async function getActiveDesignSystem(): Promise<DesignSystemId> {
  const row = await prisma.platformSetting
    .findUnique({ where: { key: DESIGN_SYSTEM_KEY } })
    .catch(() => null);
  if (!row) return DEFAULT_DESIGN_SYSTEM;
  return isValidDesignSystem(row.value) ? row.value : DEFAULT_DESIGN_SYSTEM;
}

/** Server-side writer for the admin page. Upserts the setting row
 *  and returns the persisted id. Validates the id against the
 *  registry before writing so a typo can't poison the table. */
export async function setActiveDesignSystem(id: string): Promise<DesignSystemId> {
  if (!isValidDesignSystem(id)) {
    throw new Error(`Unknown design system: ${id}`);
  }
  await prisma.platformSetting.upsert({
    where: { key: DESIGN_SYSTEM_KEY },
    create: { key: DESIGN_SYSTEM_KEY, value: id },
    update: { value: id },
  });
  return id;
}

/**
 * Maximum number of concurrent active enrollments a trainee may hold.
 * Admins/superadmins bypass this cap (see the enrol route) — the
 * limit is a learner-fairness constraint, not a security boundary.
 *
 * Cached per-request would be nice but adds complexity; this is one
 * indexed-PK lookup, well under a millisecond on Postgres.
 */
export async function getTraineeCourseLimit(): Promise<number> {
  const row = await prisma.platformSetting
    .findUnique({ where: { key: "traineeCourseLimit" } })
    .catch(() => null);
  if (!row) return DEFAULT_TRAINEE_COURSE_LIMIT;
  const parsed = parseInt(row.value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_TRAINEE_COURSE_LIMIT;
}


const DESIGN_TOKENS_KEY = "designTokenOverrides";

/**
 * Admin-set overrides for the design tokens, edited at
 * /admin/design-system/tokens.
 *
 * Read in the root layout on every request and emitted as a `:root`
 * block after globals.css, so an override wins on cascade without a
 * rebuild. Sparse by design: a token that has never been touched is
 * absent, and the active theme's own value applies.
 *
 * Every failure path returns {} rather than throwing. A malformed row
 * or a DB blip must not take the whole platform down — the worst
 * outcome should be that the shipped defaults apply.
 */
export async function getDesignTokenOverrides(): Promise<TokenOverrides> {
  const row = await prisma.platformSetting
    .findUnique({ where: { key: DESIGN_TOKENS_KEY } })
    .catch(() => null);
  if (!row) return {};
  try {
    return sanitizeOverrides(JSON.parse(row.value));
  } catch {
    return {};
  }
}

/** Writer for the admin editor. Sanitises before persisting, so the
 *  stored row can always be trusted by the reader above — and returns
 *  what was actually kept, which is what the form re-renders from. */
export async function setDesignTokenOverrides(input: unknown): Promise<TokenOverrides> {
  const clean = sanitizeOverrides(input);
  const value = JSON.stringify(clean);
  await prisma.platformSetting.upsert({
    where: { key: DESIGN_TOKENS_KEY },
    create: { key: DESIGN_TOKENS_KEY, value },
    update: { value },
  });
  return clean;
}
