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
