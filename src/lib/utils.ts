import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${Math.round(score)}%`;
}

/**
 * Status pill classes. Every foreground here is held to WCAG AA (4.5:1)
 * against the background it is paired with — these render at 12px, so
 * they never qualify for the 3:1 large-text allowance.
 *
 * The `-600` shades this used to carry mostly failed that bar:
 *   green-600/green-50   3.07    yellow-600/yellow-50  2.83
 *   red-600/red-50       4.36    gray-400/gray-50      2.49
 * Only blue-600 (4.82), gray-500 (4.63) and gray-600 (7.24) passed.
 * The accessibility gate caught green alone because `completed` was the
 * one status that happened to render on an audited page; the other
 * three were the same defect waiting on different data. Moving to -700
 * clears all of them (worst case green-700 at 4.72) without changing
 * the hue any of these statuses reads as.
 */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    completed: "text-green-700 bg-green-50",
    passed: "text-green-700 bg-green-50",
    failed: "text-red-700 bg-red-50",
    active: "text-blue-700 bg-blue-50",
    incomplete: "text-yellow-700 bg-yellow-50",
    "not attempted": "text-gray-600 bg-gray-50",
    draft: "text-gray-600 bg-gray-50",
    published: "text-green-700 bg-green-50",
    archived: "text-gray-600 bg-gray-50",
  };
  return map[status] ?? "text-gray-700 bg-gray-50";
}

export function paginate<T>(items: T[], page: number, perPage = 20) {
  const total = items.length;
  const pages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;
  return { items: items.slice(offset, offset + perPage), total, pages };
}
