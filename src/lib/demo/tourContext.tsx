"use client";
/**
 * DemoTour — global state + side-effects for the guided platform demo.
 *
 * Architecture
 * ────────────
 * DemoTourProvider  →  providers.tsx  (globally available)
 * DemoOverlay       →  dashboard layout  (visual layer, reads this context)
 * DemoHub           →  /admin/demo  (calls startTour() to launch)
 *
 * State machine
 * ────────────
 *   idle
 *     ↓ startTour()
 *   loading   (router.push to target page, wait 1400 ms for render)
 *     ↓ timer
 *   animating (cursor moving to target, 1400 ms)
 *     ↓ timer
 *   active    (tooltip visible, waiting for Next / auto-advance)
 *     ↓ nextStep() or autoMs timer
 *   loading   (repeat for next step, or EXIT → idle)
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { TourPersona, TourPhase, TourStep } from "./tourScripts";
import { TOUR_SCRIPTS } from "./tourScripts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "loading" | "animating" | "active";

interface State {
  stage:   Stage;
  persona: TourPersona | null;
  phase:   TourPhase | null;
  steps:   TourStep[];
  stepIdx: number;
}

type Action =
  | { type: "START";     persona: TourPersona; phase: TourPhase; steps: TourStep[] }
  | { type: "SET_STAGE"; stage: Stage }
  | { type: "ADVANCE";   delta: 1 | -1 }
  | { type: "EXIT" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "START":
      return { stage: "loading", persona: a.persona, phase: a.phase, steps: a.steps, stepIdx: 0 };
    case "SET_STAGE":
      return { ...s, stage: a.stage };
    case "ADVANCE": {
      const next = s.stepIdx + a.delta;
      if (next < 0 || next >= s.steps.length) return s;
      return { ...s, stepIdx: next, stage: "loading" };
    }
    case "EXIT":
      return { stage: "idle", persona: null, phase: null, steps: [], stepIdx: 0 };
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

export interface DemoTourContextValue {
  active:    boolean;
  persona:   TourPersona | null;
  phase:     TourPhase | null;
  steps:     TourStep[];
  stepIdx:   number;
  stage:     Stage;
  startTour: (persona: TourPersona, phase: TourPhase) => void;
  nextStep:  () => void;
  prevStep:  () => void;
  exitTour:  () => void;
}

const DemoTourContext = createContext<DemoTourContextValue>({
  active: false, persona: null, phase: null, steps: [], stepIdx: 0, stage: "idle",
  startTour: () => {}, nextStep: () => {}, prevStep: () => {}, exitTour: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DemoTourProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    stage: "idle", persona: null, phase: null, steps: [], stepIdx: 0,
  });
  const router   = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Always-current pathname ref — avoids stale closure in effects. */
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  // ── LOADING → ANIMATING ────────────────────────────────────────
  // Navigate to the step's page (if different from current), then
  // wait for the page to render before starting cursor animation.
  useEffect(() => {
    if (state.stage !== "loading") return;
    const step = state.steps[state.stepIdx];
    if (!step) return;

    const needsNav = !!step.page && step.page !== pathnameRef.current;
    if (needsNav) {
      try { router.push(step.page!); } catch { /* best effort */ }
    }

    clearTimer();
    timerRef.current = setTimeout(() => {
      dispatch({ type: "SET_STAGE", stage: "animating" });
    }, needsNav ? 1400 : 400);

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.stepIdx]);

  // ── ANIMATING → ACTIVE ─────────────────────────────────────────
  // Give the cursor animation time to complete, then reveal tooltip.
  useEffect(() => {
    if (state.stage !== "animating") return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      dispatch({ type: "SET_STAGE", stage: "active" });
    }, 1300);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.stepIdx]);

  // ── AUTO-ADVANCE ───────────────────────────────────────────────
  useEffect(() => {
    if (state.stage !== "active") return;
    const step = state.steps[state.stepIdx];
    if (!step?.autoMs) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (state.stepIdx >= state.steps.length - 1) {
        dispatch({ type: "EXIT" });
      } else {
        dispatch({ type: "ADVANCE", delta: 1 });
      }
    }, step.autoMs);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.stepIdx]);

  // ── Public API ─────────────────────────────────────────────────
  const startTour = useCallback((persona: TourPersona, phase: TourPhase) => {
    const script = TOUR_SCRIPTS.find(s => s.persona === persona && s.phase === phase);
    if (!script) return;
    dispatch({ type: "START", persona, phase, steps: script.steps });
  }, []);

  const nextStep = useCallback(() => {
    if (state.stepIdx >= state.steps.length - 1) {
      clearTimer();
      dispatch({ type: "EXIT" });
    } else {
      dispatch({ type: "ADVANCE", delta: 1 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stepIdx, state.steps.length]);

  const prevStep = useCallback(() => {
    dispatch({ type: "ADVANCE", delta: -1 });
  }, []);

  const exitTour = useCallback(() => {
    clearTimer();
    dispatch({ type: "EXIT" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DemoTourContext.Provider value={{
      active:  state.stage !== "idle",
      persona: state.persona,
      phase:   state.phase,
      steps:   state.steps,
      stepIdx: state.stepIdx,
      stage:   state.stage,
      startTour, nextStep, prevStep, exitTour,
    }}>
      {children}
    </DemoTourContext.Provider>
  );
}

export function useDemoTour() { return useContext(DemoTourContext); }
