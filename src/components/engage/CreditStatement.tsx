"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Credit statement — the headline block of the Progress Tracker.
 *
 * Leads with the BALANCE rather than the amount used. A trainee's actual
 * question is "how much do I have left to spend", and the previous
 * treatment made them subtract to find out: it showed used-of-total and
 * buried the balance in a sentence.
 *
 * Motion, and why it is what it is:
 *
 *   • The bar fills once on mount over 940ms on a settle curve that
 *     decelerates hard through the second half. The travel IS the
 *     information — you watch the value arrive at its place on the scale,
 *     which a static bar cannot convey.
 *   • The threshold marker gives exactly ONE tick as the fill crosses it.
 *     Not a loop: ambient pulsing draws the eye permanently, ages badly,
 *     and would compete with everything else on the page.
 *   • The balance counts in step with the bar so the number and the fill
 *     arrive together rather than racing.
 *
 * The bar animates `transform: scaleX()`, never `width` — width reflows on
 * every frame, transform composites. The rounding therefore lives on the
 * track with `overflow-hidden` and the inner fill stays square, otherwise
 * scaling would stretch the end caps.
 *
 * SSR / no-JS / reduced motion all render the FINAL values. The animation
 * only ever runs by snapping to a start state on mount and playing forward,
 * so nothing depends on JavaScript to become correct.
 */

/** Decelerating curve — matches the quartic ease-out used for the digits,
 *  so the fill and the numbers stay in step for the whole travel. */
const SETTLE = "linear(0, .28 8%, .58 17%, .78 25%, .91 33%, .97 41%, 1 52%, 1)";
const TICK_EASE = "cubic-bezier(.22, 1, .36, 1)";
const FILL_MS = 940;

interface Props {
  used: number;
  total: number;
  threshold: number;
  balance: number;
  /** Rendered as-is; formatted on the server to avoid a locale mismatch. */
  asOf: string;
  thresholdMet: boolean;
  className?: string;
}

export function CreditStatement({
  used, total, threshold, balance, asOf, thresholdMet, className,
}: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const tickRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Seeded with the true value so the server render, a no-JS render and a
  // reduced-motion render are all already correct.
  const [shownBalance, setShownBalance] = useState(balance);

  const fraction = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0;
  const thresholdPct = total > 0 ? (threshold / total) * 100 : 0;

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      bar.style.transform = `scaleX(${fraction})`;
      return;
    }

    // Snap to the start, then play forward on the next frame.
    bar.style.transition = "none";
    bar.style.transform = "scaleX(0)";
    void bar.offsetWidth;
    bar.style.transition = `transform ${FILL_MS}ms ${SETTLE}`;
    bar.style.transform = `scaleX(${fraction})`;

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FILL_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      setShownBalance(Math.round(total - (total - balance) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    // One acknowledgement as the fill passes the threshold. 0.62 lands the
    // tick where the settle curve actually crosses it, not where a linear
    // fill would have.
    let tickTimer: number | undefined;
    let restTimer: number | undefined;
    if (used > threshold) {
      const at = FILL_MS * (threshold / used) * 0.62;
      tickTimer = window.setTimeout(() => {
        const el = tickRef.current;
        if (!el) return;
        el.style.transition = `transform 200ms ${TICK_EASE}, opacity 200ms ${TICK_EASE}`;
        el.style.transform = "scaleY(1.5)";
        el.style.opacity = "1";
        restTimer = window.setTimeout(() => {
          el.style.transform = "scaleY(1)";
          el.style.opacity = "";
        }, 200);
      }, at);
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (tickTimer) window.clearTimeout(tickTimer);
      if (restTimer) window.clearTimeout(restTimer);
    };
  }, [fraction, used, total, balance, threshold]);

  return (
    <div className={cn("", className)}>
      <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle">
        Credits remaining
      </p>

      <p className="mt-1 text-5xl sm:text-6xl font-bold tracking-tight tabular-nums text-fg leading-none">
        {shownBalance.toLocaleString()}
      </p>

      <p className="mt-1.5 text-xs text-subtle">As of {asOf}</p>

      {/* Meter. The progressbar role carries the real value — the bar is
          otherwise pure colour to a screen reader. */}
      <div className="mt-5 relative">
        <div
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Credit utilisation"
          className="h-2.5 w-full rounded-full bg-elevated overflow-hidden"
        >
          <div
            ref={barRef}
            className="h-full w-full origin-left bg-brand-600"
            style={{ transform: `scaleX(${fraction})` }}
          />
        </div>
        <div
          ref={tickRef}
          aria-hidden="true"
          className="absolute top-0 h-2.5 w-0.5 rounded-sm bg-fg/45 origin-center"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>

      <div className="relative mt-1.5 h-4">
        <p className="absolute left-0 text-[10px] font-semibold text-subtle tabular-nums">0</p>
        <p
          className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] tabular-nums"
          style={{ left: `${thresholdPct}%` }}
        >
          <span className="text-subtle">{threshold.toLocaleString()} threshold</span>
          {thresholdMet && <span className="text-emerald-600"> · met</span>}
        </p>
        <p className="absolute right-0 text-[10px] font-semibold text-subtle tabular-nums">
          {total.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
