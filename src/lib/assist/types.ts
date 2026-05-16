/**
 * Shared types for the AI behaviour-assist pipeline. Lives in its
 * own file so the client telemetry SDK + server endpoints +
 * dashboards all agree on the wire shapes without circular imports.
 */

export type AssistEventKind =
  | "click"
  | "rage_click"
  | "dead_click"
  | "surface.view"
  | "form.focus"
  | "form.field_complete"
  | "form.abandon"
  | "form.submit_attempt"
  | "error.client"
  | "dwell"
  | "idle.start"
  | "idle.end";

export interface AssistEventInput {
  /** Stable per-tab session id minted client-side. */
  sessionId: string;
  /** Client-side wall-clock for the event (ms epoch). Server stamps
   *  its own `ts` on insert so clock-skew can't break ordering. */
  clientTs?: number;
  kind: AssistEventKind;
  /** Route or `data-surface` key. e.g. "/employer/postings". */
  surface?: string;
  /** Human-readable target ("Edit profile button"), never raw DOM. */
  target?: string;
  /** kind-specific extras. Stay small — Prisma JSON columns are
   *  cheap but the AI prompt budget isn't. */
  payload?: Record<string, unknown>;
}

/** Hint shape the client renders in the chip dock. */
export interface AssistHintPayload {
  id: string;
  helpKey: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  surface: string | null;
  /** Show the hint only on this surface (or any surface if null). */
  scopedSurface?: string | null;
}

export type HintFeedbackKind =
  | "shown"
  | "clicked"
  | "dismissed"
  | "ignored"
  | "rated";

/** Snapshot of a user's recent behaviour, fed to the AI inference
 *  step and used by the rule-based scorer. Lives in memory; never
 *  persisted to the DB directly. */
export interface RecentBehaviour {
  userId: string;
  surface: string | null;
  windowMs: number;
  events: {
    ts: Date;
    kind: AssistEventKind;
    surface: string | null;
    target: string | null;
  }[];
  /** Counts for fast rule scoring. */
  counts: {
    total: number;
    rageClicks: number;
    deadClicks: number;
    formAbandons: number;
    errors: number;
    dwellMs: number;
    distinctSurfaces: number;
  };
}
