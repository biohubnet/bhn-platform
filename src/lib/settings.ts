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

const DEFAULT_TRAINEE_COURSE_LIMIT = 3;

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
