/**
 * Dashboard promos — the "What's on" band under the /dashboard hero.
 *
 * Pure helpers only (no Prisma), so the admin client can import the
 * kinds and the schema. Reads live in ./queries.
 *
 * Dates are calendar days. Postgres DATE comes back as a Date at UTC
 * midnight, so everything here compares and formats in UTC, and "today"
 * is Toronto's date expressed the same way.
 */
import { z } from "zod";

export const PROMO_KINDS = ["event", "workshop", "announcement"] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];

export const PROMO_KIND_LABELS: Record<PromoKind, string> = {
  event: "Events",
  workshop: "Workshops",
  announcement: "Announcements",
};

/** How many cards of one kind the band shows at once. */
export const PROMOS_PER_KIND = 3;

/** A path on this site ("/events/x", never "//host") or an https:// URL.
 *  No whitespace or control characters anywhere: browsers strip tabs and
 *  newlines from URLs, so "/\t/evil.example" would become "//evil.example". */
export function isSafePromoHref(href: string): boolean {
  if (/[\s\u0000-\u001f\u007f]/.test(href)) return false;
  if (href.startsWith("/")) return !href.startsWith("//") && !href.startsWith("/\\");
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().transform((v) => v || null);

/** "YYYY-MM-DD" that is a real day (rejects 2026-02-30, which Date rolls over). */
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-29")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
  }, "Not a real date")
  .nullable();

export const PromoInput = z
  .object({
    kind: z.enum(PROMO_KINDS),
    title: z.string().trim().min(1, "Add a title").max(120),
    summary: z.string().trim().min(1, "Add a short summary").max(300),
    startDate: day,
    endDate: day,
    location: optionalText(120),
    ctaLabel: optionalText(40),
    ctaHref: optionalText(500).refine(
      (v) => v === null || isSafePromoHref(v),
      "The link must start with / or https://",
    ),
    showUntil: day,
    status: z.enum(["draft", "published"]),
    displayOrder: z.number().int().min(-999).max(999),
  })
  .refine((p) => !p.endDate || !!p.startDate, {
    message: "Add a start date before an end date",
    path: ["endDate"],
  })
  .refine((p) => !p.endDate || !p.startDate || p.endDate >= p.startDate, {
    message: "The end date is before the start date",
    path: ["endDate"],
  });
export type PromoInputData = z.infer<typeof PromoInput>;

const toDay = (v: string | null) => (v ? new Date(`${v}T00:00:00Z`) : null);

/** Validated input → Prisma data. A link without a label gets "Learn more". */
export function toPromoData(p: PromoInputData) {
  return {
    ...p,
    startDate: toDay(p.startDate),
    endDate: toDay(p.endDate),
    showUntil: toDay(p.showUntil),
    ctaLabel: p.ctaHref ? (p.ctaLabel ?? "Learn more") : null,
  };
}

/** A DATE value back to "YYYY-MM-DD", for form fields. */
export function dayString(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Toronto's date today, at UTC midnight — the form DATE columns compare against. */
export function torontoToday(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00Z`);
}

interface PromoWindow {
  startDate: Date | null;
  endDate: Date | null;
  showUntil: Date | null;
}

/** Still worth showing today: not past its "show until" day, and not over. */
export function isPromoCurrent(p: PromoWindow, today: Date): boolean {
  if (p.showUntil && p.showUntil < today) return false;
  const lastDay = p.endDate ?? p.startDate;
  return !lastDay || lastDay >= today;
}

/**
 * Published rows (already in display order) → the band's groups: current
 * cards only, at most PROMOS_PER_KIND each, kinds in a fixed order, empty
 * kinds dropped.
 */
export function groupPromos<T extends PromoWindow & { kind: string }>(rows: T[], today: Date) {
  const current = rows.filter((r) => isPromoCurrent(r, today));
  return PROMO_KINDS.map((kind) => ({
    kind,
    items: current.filter((r) => r.kind === kind).slice(0, PROMOS_PER_KIND),
  })).filter((g) => g.items.length > 0);
}

/** "Thu, Oct 29" for one day, "Oct 26 – 28" within a month, "Oct 30 – Nov 2" across one. */
export function formatPromoDates(start: Date, end: Date | null): string {
  const md = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
  if (!end || end.getTime() === start.getTime()) {
    return new Intl.DateTimeFormat("en-CA", {
      weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
    }).format(start);
  }
  const a = md.format(start);
  const b = md.format(end);
  return start.getUTCMonth() === end.getUTCMonth() ? `${a} – ${b.split(" ")[1]}` : `${a} – ${b}`;
}
