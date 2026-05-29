/** Display formatters for metric values. null → "—" everywhere. */

export function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("en-CA");
}

export function fmtPercent(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtDays(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1) return "< 1 day";
  return `${n.toFixed(1)} days`;
}

export function fmtMoney(n: number | null | undefined, currency = "CAD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(n);
}

export function fmtRatio(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}×`;
}

/** Safe division → percentage (0–100), or null when denominator is 0. */
export function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return (numerator / denominator) * 100;
}

/** Median of a numeric list, or null when empty. */
export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Percentile (0–100) of a numeric list, or null when empty. */
export function percentile(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
}

/** Whole days between two instants (b - a), floored at 0. */
export function daysBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 86_400_000);
}
