/**
 * Helpers for the per-user AutoPipette preferences row.
 *
 * Reads return an OPT-IN default when no row exists yet —
 * AutoPipette is on-by-default platform-wide, and a first-run
 * notice banner in the dashboard layout informs the user with
 * a one-click opt-out. Writes are explicit upserts.
 */
import { prisma } from "@/lib/prisma";

const DEFAULT_THRESHOLD = 0.75;

export interface AssistPrefs {
  consented: boolean;
  hintsDisabled: boolean;
  confidenceThreshold: number;
  suppressUntil: Date | null;
}

/** What a user who's never touched the toggle gets back. Mirrors the
 *  schema-level default on AssistPreferences so the in-memory
 *  fallback and the DB-side row agree. */
const OPT_IN_DEFAULT: AssistPrefs = {
  consented: true,
  hintsDisabled: false,
  confidenceThreshold: DEFAULT_THRESHOLD,
  suppressUntil: null,
};

/** Read prefs. Returns the opt-in default if the row doesn't
 *  exist yet — same shape new rows get from the schema default. */
export async function getAssistPrefs(userId: string): Promise<AssistPrefs> {
  const row = await prisma.assistPreferences.findUnique({
    where: { userId },
  }).catch(() => null);
  if (!row) return OPT_IN_DEFAULT;
  return {
    consented: row.consented,
    hintsDisabled: row.hintsDisabled,
    confidenceThreshold: row.confidenceThreshold,
    suppressUntil: row.suppressUntil,
  };
}

/** Upsert prefs. Caller passes only the fields they want to change. */
export async function updateAssistPrefs(
  userId: string,
  patch: Partial<AssistPrefs> & { consented?: boolean },
): Promise<AssistPrefs> {
  // consented going false→true sets consentedAt. consented going
  // true→false leaves consentedAt alone (so audit can show the
  // original opt-in time).
  const setConsentedAt =
    patch.consented === true ? { consentedAt: new Date() } : {};

  const row = await prisma.assistPreferences.upsert({
    where: { userId },
    create: {
      userId,
      // On-by-default: matches the schema-level column default. A
      // first-time opt-out via the toggle still works — the caller
      // would pass `consented: false` and we'd honour it here.
      consented: patch.consented ?? true,
      hintsDisabled: patch.hintsDisabled ?? false,
      confidenceThreshold: patch.confidenceThreshold ?? DEFAULT_THRESHOLD,
      suppressUntil: patch.suppressUntil ?? null,
      ...setConsentedAt,
    },
    update: {
      ...(patch.consented !== undefined && { consented: patch.consented }),
      ...(patch.hintsDisabled !== undefined && { hintsDisabled: patch.hintsDisabled }),
      ...(patch.confidenceThreshold !== undefined && {
        confidenceThreshold: patch.confidenceThreshold,
      }),
      ...("suppressUntil" in patch && { suppressUntil: patch.suppressUntil }),
      ...setConsentedAt,
    },
  });
  return {
    consented: row.consented,
    hintsDisabled: row.hintsDisabled,
    confidenceThreshold: row.confidenceThreshold,
    suppressUntil: row.suppressUntil,
  };
}

/** Should we show a hint right now? Combines the user's prefs with
 *  the candidate hint's confidence + the global floor. */
export function shouldShowHint(opts: {
  prefs: AssistPrefs;
  confidence: number;
  /** Global floor — admins can dial this up in /admin/settings to
   *  make the whole platform calmer. */
  globalFloor?: number;
}): boolean {
  if (opts.prefs.hintsDisabled) return false;
  if (opts.prefs.suppressUntil && opts.prefs.suppressUntil.getTime() > Date.now()) return false;
  const threshold = Math.max(opts.prefs.confidenceThreshold, opts.globalFloor ?? 0);
  return opts.confidence >= threshold;
}
