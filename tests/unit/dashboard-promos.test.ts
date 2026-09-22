import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import {
  formatPromoDates, groupPromos, isPromoCurrent, isSafePromoHref, PromoInput, toPromoData, torontoToday,
} from "../../src/lib/dashboard-promos";
import { POST as createPromo } from "../../src/app/api/admin/dashboard-promos/route";
import { DELETE as deletePromo, PATCH as updatePromo } from "../../src/app/api/admin/dashboard-promos/[id]/route";

const day = (v: string) => new Date(`${v}T00:00:00Z`);

const valid = {
  kind: "event", title: " Annual Symposium 2026 ", summary: "One day, the whole network.",
  startDate: "2026-10-29", endDate: null, location: "", ctaLabel: null,
  ctaHref: "/events/2026-annual-symposium", showUntil: null, status: "published", displayOrder: 0,
};

test("PromoInput accepts a card, trims text and blanks empty strings", () => {
  const r = PromoInput.safeParse(valid);
  expect(r.success).toBe(true);
  if (!r.success) return;
  expect(r.data.title).toBe("Annual Symposium 2026");
  expect(r.data.location).toBeNull();
  const data = toPromoData(r.data);
  expect(data.startDate?.toISOString()).toBe("2026-10-29T00:00:00.000Z");
  expect(data.ctaLabel).toBe("Learn more");
});

test("PromoInput rejects unsafe links and impossible dates", () => {
  for (const ctaHref of ["javascript:alert(1)", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n\\evil.example", "http://example.com", "data:text/html,x"]) {
    expect(PromoInput.safeParse({ ...valid, ctaHref }).success, ctaHref).toBe(false);
  }
  expect(isSafePromoHref("https://lu.ma/bhn")).toBe(true);
  expect(PromoInput.safeParse({ ...valid, startDate: "2026-02-30" }).success).toBe(false);
  expect(PromoInput.safeParse({ ...valid, startDate: "2026-10-29", endDate: "2026-10-28" }).success).toBe(false);
  expect(PromoInput.safeParse({ ...valid, startDate: null, endDate: "2026-10-28" }).success).toBe(false);
  expect(PromoInput.safeParse({ ...valid, kind: "banner" }).success).toBe(false);
});

test("a card stays up through its last day and its show-until day", () => {
  const today = day("2026-10-28");
  const none = { startDate: null, endDate: null, showUntil: null };
  expect(isPromoCurrent(none, today)).toBe(true);
  expect(isPromoCurrent({ ...none, startDate: day("2026-10-26"), endDate: day("2026-10-28") }, today)).toBe(true);
  expect(isPromoCurrent({ ...none, startDate: day("2026-10-27") }, today)).toBe(false);
  expect(isPromoCurrent({ ...none, showUntil: day("2026-10-28") }, today)).toBe(true);
  expect(isPromoCurrent({ ...none, showUntil: day("2026-10-27") }, today)).toBe(false);
  // 11 pm in Toronto is already the next day in UTC; "today" must stay Toronto's.
  expect(torontoToday(new Date("2026-10-29T03:30:00Z")).toISOString()).toBe("2026-10-28T00:00:00.000Z");
});

test("the band keeps kind order, drops past cards and shows three per kind", () => {
  const row = (id: string, kind: string, startDate: Date | null = null) =>
    ({ id, kind, startDate, endDate: null, showUntil: null });
  const groups = groupPromos([
    row("a1", "announcement"), row("w1", "workshop"), row("w2", "workshop"), row("w3", "workshop"),
    row("w4", "workshop"), row("old", "event", day("2026-01-01")),
  ], day("2026-10-01"));
  expect(groups.map((g) => g.kind)).toEqual(["workshop", "announcement"]);
  expect(groups[0].items.map((i) => i.id)).toEqual(["w1", "w2", "w3"]);
});

test("promo dates read like the rest of the dashboard", () => {
  expect(formatPromoDates(day("2026-10-29"), null)).toBe("Thu, Oct 29");
  expect(formatPromoDates(day("2026-10-26"), day("2026-10-28"))).toBe("Oct 26 – 28");
  expect(formatPromoDates(day("2026-10-30"), day("2026-11-02"))).toBe("Oct 30 – Nov 2");
});

test("promo admin routes turn away a caller with no session", async () => {
  const req = (method: string) =>
    new NextRequest("https://bhn.test/api/admin/dashboard-promos/p1", { method, body: method === "DELETE" ? undefined : JSON.stringify(valid) });
  const ctx = { params: Promise.resolve({ id: "p1" }) };
  for (const res of [await createPromo(req("POST")), await updatePromo(req("PATCH"), ctx), await deletePromo(req("DELETE"), ctx)]) {
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  }
});
