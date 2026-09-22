import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import { ApplicationStrip, creditAppStatus, internshipAppStatus } from "../../src/components/dashboards/ApplicationStrip";
import { POST as recordView } from "../../src/app/api/profile-views/route";

const when = new Date("2026-09-20T15:00:00Z");
const sub = (reviewStatus: string, extra: Partial<{ eligibilityApprovedAt: Date | null; leftPoolAt: Date | null }> = {}) => ({
  reviewStatus, createdAt: when, reviewedAt: null, reviewerNote: null, eligibilityApprovedAt: null, leftPoolAt: null, ...extra,
});
const credit = (status: string) => ({ status, submittedAt: when, reviewedAt: null, reviewerNote: null });

test("credit application status maps onto the card states", () => {
  expect(creditAppStatus(null).state).toBe("none");
  expect(creditAppStatus(credit("pending")).state).toBe("pending");
  expect(creditAppStatus(credit("approved")).state).toBe("approved");
  expect(creditAppStatus(credit("rejected")).state).toBe("rejected");
});

test("internship application status maps onto the card states", () => {
  expect(internshipAppStatus(null).state).toBe("none");
  expect(internshipAppStatus(sub("pending")).state).toBe("pending");
  expect(internshipAppStatus(sub("rejected")).state).toBe("rejected");
  expect(internshipAppStatus(sub("approved_skip_review")).state).toBe("approved");
  // Approved but not yet cleared for employers is still approved, just not visible.
  expect(internshipAppStatus(sub("approved")).visibleToEmployers).toBe(false);
  expect(internshipAppStatus(sub("approved", { eligibilityApprovedAt: when })).visibleToEmployers).toBe(true);
  // Leaving the pool offers the application again.
  expect(internshipAppStatus(sub("approved", { leftPoolAt: when })).state).toBe("none");
});

test("the application strip disappears only once both are approved", () => {
  const approved = { state: "approved" as const };
  expect(ApplicationStrip({ credit: approved, internship: approved, ttlDays: 365 })).toBeNull();
  expect(ApplicationStrip({ credit: approved, internship: { state: "pending" }, ttlDays: 365 })).not.toBeNull();
  expect(ApplicationStrip({ credit: { state: "none" }, internship: approved, ttlDays: 365 })).not.toBeNull();
});

test("recording a profile view needs a session", async () => {
  const res = await recordView(new NextRequest("https://bhn.test/api/profile-views", {
    method: "POST", body: JSON.stringify({ userId: "u1", surface: "resume" }),
  }));
  expect(res.status).toBe(401);
});
