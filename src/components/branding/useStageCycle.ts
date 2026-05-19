"use client";

/**
 * useStageCycle — shared timing engine for the multi-stage
 * looping process animations on /login (MSC passaging cycle,
 * DNA transcription, antibody binding, Western blot run,
 * CAR-T kill cycle). Pure React + setTimeout — no rAF, no
 * external animation lib.
 *
 * Behaviour:
 *   • starts at `order[0]` and walks the cycle on a per-stage
 *     timeout taken from the `durations` record;
 *   • loops back to `order[0]` after the last stage;
 *   • freezes on `order[0]` when prefers-reduced-motion is on,
 *     so motion-sensitive users see a static depiction of the
 *     first stage instead of an animated cycle;
 *   • returns the current stage AND a `reducedMotion` flag the
 *     caller can use to nullify CSS transitions inside its SVG
 *     so attribute changes snap rather than animate;
 *   • SSR-safe — initial render is order[0] / reducedMotion=false.
 */

import { useEffect, useState } from "react";

/** Public hook return — both the current stage and the
 *  reduced-motion flag (so the caller can disable inline CSS
 *  transitions when appropriate). */
export interface StageCycleResult<S extends string> {
  stage: S;
  stageIdx: number;
  reducedMotion: boolean;
  /** CSS `transition` value to pass on SVG attributes inside
   *  the rendered stage. Either undefined (use the caller's own
   *  default) or "none" (when reduced-motion is on). */
  noTransition: "none" | undefined;
}

/** Caller passes a record keyed by stage with at least a
 *  `duration` field (callers usually carry `label`, `sub`, etc.
 *  alongside — those are ignored here). */
export function useStageCycle<S extends string>(
  order: readonly S[],
  info: Readonly<Record<S, { duration: number }>>,
): StageCycleResult<S> {
  const [stageIdx, setStageIdx] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return; // Freeze on order[0]
    const stage = order[stageIdx];
    const t = window.setTimeout(() => {
      setStageIdx((i) => (i + 1) % order.length);
    }, info[stage].duration);
    return () => window.clearTimeout(t);
  }, [stageIdx, reducedMotion, order, info]);

  return {
    stage: order[stageIdx],
    stageIdx,
    reducedMotion,
    noTransition: reducedMotion ? "none" : undefined,
  };
}

/** Read the user's prefers-reduced-motion preference. Returns
 *  the current value AND subscribes to changes so callers react
 *  if the OS setting flips mid-session. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
