/**
 * Shared helpers for the matching-engine animation variants.
 *
 * Every variant takes the same MatchingConfig and computes the same
 * "sample fit" — a demo score derived from typical subscore
 * utilisation × the live weights. The eased counter, band detection,
 * and tone-colour table all live here so each variant focuses on the
 * unique visual it brings.
 */
import { useEffect, useMemo, useState } from "react";
import type { MatchingConfig } from "@/lib/matching/config";

export const SAMPLE_UTIL = { direct: 0.80, semantic: 0.60, pathway: 0.50 } as const;

export interface SampleScore {
  score: number;
  band: "high" | "medium" | "low";
  bandLabel: string;
  tone: string;
}

export function useSampleScore(cfg: MatchingConfig): SampleScore {
  const target = useMemo(() => {
    const s =
      cfg.weights.direct   * SAMPLE_UTIL.direct +
      cfg.weights.semantic * SAMPLE_UTIL.semantic +
      cfg.weights.pathway  * SAMPLE_UTIL.pathway;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [cfg.weights]);

  const [display, setDisplay] = useState(target);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const start = display;
    const dur = 700;
    function tick() {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const band =
    display >= cfg.bands.high   ? "high" :
    display >= cfg.bands.medium ? "medium" : "low";
  const tone =
    band === "high"   ? "#34d399" :
    band === "medium" ? "#fbbf24" : "#94a3b8";
  const bandLabel =
    band === "high"   ? "STRONG" :
    band === "medium" ? "POSSIBLE" : "WEAK";
  return { score: display, band, bandLabel, tone };
}

export const SUBSCORE_HUES = {
  direct:   "#22d3ee",
  semantic: "#a855f7",
  pathway:  "#f59e0b",
} as const;
