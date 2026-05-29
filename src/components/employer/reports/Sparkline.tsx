/**
 * Hand-rolled inline-SVG sparkline (no chart dependency — matches the
 * platform's existing div/SVG-bar approach). Server-safe (no hooks).
 * Inherits colour via `currentColor`, so the parent sets the accent.
 */
import type { SeriesPoint } from "@/lib/employer/reporting/types";

export function Sparkline({
  points,
  width = 104,
  height = 30,
  className = "",
}: {
  points: SeriesPoint[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const vals = points.map((p) => p.v).filter((v): v is number => v != null);
  if (vals.length < 2) return null;

  const max = Math.max(...vals);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const n = points.length;

  const coords = points.map((p, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * (width - 2) + 1;
    const v = p.v ?? min;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={area} fill="currentColor" opacity={0.1} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2} fill="currentColor" />
    </svg>
  );
}
