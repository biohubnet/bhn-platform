/**
 * Master kill-switch for the AutoPipette behaviour-assist subsystem —
 * event ingestion, stuck-scoring, rule + AI hints (incl. `assist_stuck`),
 * the client tracker + chip dock, and the weekly-summary cron.
 *
 * DISABLED by default (turned off 2026-06-24 by request). Re-enable
 * WITHOUT a code change by setting this env var and redeploying:
 *
 *     NEXT_PUBLIC_ASSIST_ENABLED=true
 *
 * It is NEXT_PUBLIC_ so the one flag reads identically on the server
 * (route handlers, cron) and on the client (the tracker/dock mount in
 * the dashboard layout). No secret value — it's a feature toggle.
 */
export const ASSIST_ENABLED =
  process.env.NEXT_PUBLIC_ASSIST_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_ASSIST_ENABLED === "1";

/** Convenience inverse for early-return guard clauses. */
export const ASSIST_DISABLED = !ASSIST_ENABLED;
