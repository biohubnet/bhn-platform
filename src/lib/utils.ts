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

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    completed: "text-green-600 bg-green-50",
    passed: "text-green-600 bg-green-50",
    failed: "text-red-600 bg-red-50",
    active: "text-blue-600 bg-blue-50",
    incomplete: "text-yellow-600 bg-yellow-50",
    "not attempted": "text-gray-500 bg-gray-50",
    draft: "text-gray-500 bg-gray-50",
    published: "text-green-600 bg-green-50",
    archived: "text-gray-400 bg-gray-50",
  };
  return map[status] ?? "text-gray-600 bg-gray-50";
}

export function paginate<T>(items: T[], page: number, perPage = 20) {
  const total = items.length;
  const pages = Math.ceil(total / perPage);
  const offset = (page - 1) * perPage;
  return { items: items.slice(offset, offset + perPage), total, pages };
}
