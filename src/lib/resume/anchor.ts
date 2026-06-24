/**
 * Helpers for the structured job/role fields on master experience
 * groups (title / company / location / start / end / current) and the
 * "remove punctuation" tool.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Subtitle for display — "Company · Location", falling back to the
 *  legacy free-text anchorSubtitle when the structured fields are unset. */
export function composeSubtitle(
  company?: string | null,
  location?: string | null,
  fallback?: string | null,
): string | null {
  const parts = [company?.trim(), location?.trim()].filter(Boolean) as string[];
  if (parts.length) return parts.join(" · ");
  return fallback?.trim() || null;
}

/** "May 2025 – Present" / "May 2025 – Aug 2025", falling back to the
 *  legacy free-text anchorDateRange. */
export function composeDateRange(
  start?: string | null,
  end?: string | null,
  current?: boolean,
  fallback?: string | null,
): string | null {
  const s = start?.trim();
  const e = end?.trim();
  if (s || e || current) {
    if (current) return s ? `${s} – Present` : "Present";
    if (s && e) return `${s} – ${e}`;
    return s || e || null;
  }
  return fallback?.trim() || null;
}

/** Split a "Mon YYYY" string into its month + year parts for the editor.
 *  Tolerates "May 2025", "2025", "05/2025", "2025-05". */
export function splitMonthYear(value?: string | null): { month: string; year: string } {
  const v = (value ?? "").trim();
  if (!v) return { month: "", year: "" };
  const monthName = MONTHS.find((m) => new RegExp(`^${m}`, "i").test(v));
  const year = v.match(/\b(19|20)\d{2}\b/)?.[0] ?? "";
  if (monthName) return { month: monthName, year };
  const numMatch = v.match(/\b(0?[1-9]|1[0-2])\b/);
  if (numMatch && year) return { month: MONTHS[Number(numMatch[1]) - 1] ?? "", year };
  return { month: "", year };
}

export function joinMonthYear(month: string, year: string): string {
  const m = month.trim();
  const y = year.trim();
  if (m && y) return `${m} ${y}`;
  return y || m || "";
}

/**
 * Strip ATS-unfriendly punctuation from a line. Removes quotes, pipes,
 * bullets, brackets, commas, semicolons/colons, exclaim/question marks,
 * em/en dashes, and sentence-ending periods — while KEEPING decimals
 * (3.5), hyphenated/compound words, and the symbols + # & % $ / @ that
 * carry meaning on a resume.
 */
export function stripPunctuation(text: string): string {
  return text
    .replace(/[—–]/g, " ")
    .replace(/[“”„‟"'’‘`]/g, "")
    .replace(/[|•·]/g, " ")
    .replace(/[()[\]{}<>]/g, "")
    .replace(/[;:!?]/g, "")
    .replace(/,/g, "")
    .replace(/\.(?=\s|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
