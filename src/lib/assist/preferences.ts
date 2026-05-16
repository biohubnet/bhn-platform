/**
 * Helpers for the per-user assist preferences row.
 *
 * Reads have a permissive default (everything off) so a user who's
 * never touched the toggle simply gets no telemetry collected and
 * no hints surfaced. Writes are explicit upserts.
 */
import { prisma } from "@/lib/prisma";

const DEFAULT_THRESHOLD = 0.75;

export interface AssistPrefs {
  consented: boolean;
  hintsDisabled: boolean;
  confidenceThreshold: number;
  suppressUntil: Date | null;
}

const PERMISSIVE: AssistPrefs = {
  consented: false,
  hintsDisabled: false,
  confidenceThreshold: DEFAULT_THRESHOLD,
  suppressUntil: null,
};

/** Read prefs. Returns the permissive default if the row doesn't
 *  exist yet — that's the "never opted in" state. */
export async function getAssistPrefs(userId: string): Promise<AssistPrefs> {
  const row = await prisma.assistPreferences.findUnique({
    where: { userId },
  }).catch(() => null);
  if (!row) return PERMISSIVE;
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
      consented: patch.consented ?? false,
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
