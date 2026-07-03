/**
 * WCAG 2.2 AA audit — public pages + the trainee-facing surface.
 *
 * This DB snapshot has no seeded `trainee`-role account (only
 * `instructor` and `superadmin` exist today), so this file runs under
 * the `admin-chromium` project and uses the platform's own view-as
 * feature (`POST /api/admin/act-as`, see src/app/api/admin/act-as) to
 * render every page exactly as a trainee would see it — that route's
 * own docstring calls it out as "full preview surface for QA and
 * demos," which is precisely this use. Filename still needs an
 * `.admin.spec.ts` suffix for Playwright's project matching in
 * playwright.config.ts even though the content is trainee-focused.
 *
 * Public pages are scanned with an EMPTY storage state (no session at
 * all) so they reflect what a signed-out visitor actually sees, not
 * an admin's logged-in nav.
 */
import { test } from "@playwright/test";
import { auditPage, type AuditedPage } from "./a11y-helpers";

const PUBLIC_PAGES: AuditedPage[] = [
  { path: "/", label: "Home / marketing" },
  { path: "/login", label: "Login form" },
  { path: "/register", label: "Register form" },
  { path: "/for-trainees", label: "For trainees (marketing)" },
];

const TRAINEE_PAGES: AuditedPage[] = [
  { path: "/dashboard", label: "Trainee dashboard" },
  { path: "/courses", label: "Course catalog" },
  { path: "/career-paths", label: "Career paths" },
  { path: "/profile", label: "Trainee profile (forms)" },
  { path: "/mock-interview", label: "Mock interview (interactions)" },
];

test.describe("a11y: public (signed out)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const { path, label } of PUBLIC_PAGES) {
    test(`a11y: ${label} — ${path}`, async ({ page }, testInfo) => {
      await auditPage(page, path, testInfo);
    });
  }

  test.describe("responsive (mobile viewport)", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("a11y mobile: Home / marketing — /", async ({ page }, testInfo) => {
      await auditPage(page, "/", testInfo);
    });
  });
});

test.describe("a11y: trainee view (act-as, via admin session)", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post("/api/admin/act-as", { data: { role: "trainee" } });
    if (!res.ok()) {
      throw new Error(
        `act-as trainee failed (${res.status()}) — the admin-chromium storage state ` +
          `must belong to a real superadmin/admin account. See auth.setup.ts.`,
      );
    }
  });
  test.afterEach(async ({ page }) => {
    await page.request.delete("/api/admin/act-as").catch(() => {});
  });

  for (const { path, label } of TRAINEE_PAGES) {
    test(`a11y: ${label} — ${path}`, async ({ page }, testInfo) => {
      await auditPage(page, path, testInfo);
    });
  }

  test.describe("responsive (mobile viewport)", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("a11y mobile: Trainee dashboard — /dashboard", async ({ page }, testInfo) => {
      await auditPage(page, "/dashboard", testInfo);
    });
  });
});
