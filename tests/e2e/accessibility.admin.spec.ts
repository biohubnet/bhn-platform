/**
 * WCAG 2.2 AA audit — admin + employer authenticated surface.
 *
 * `/admin/design-system` is included deliberately: it's the shared
 * component library page, so a violation there is a defect that
 * propagates into every screen built from those components.
 * `/employer/applicants` is the ATS kanban board — the densest
 * interaction surface in the product (drag targets, per-card actions).
 *
 * Runs under the `admin-chromium` project (see playwright.config.ts).
 */
import { test } from "@playwright/test";
import { auditPage, type AuditedPage } from "./a11y-helpers";

const ADMIN_PAGES: AuditedPage[] = [
  { path: "/admin", label: "Admin dashboard (navigation)" },
  { path: "/admin/design-system", label: "Design system (component library)" },
  { path: "/admin/analytics", label: "Admin analytics (content)" },
];

const EMPLOYER_PAGES: AuditedPage[] = [
  { path: "/employer", label: "Employer home" },
  { path: "/employer/applicants", label: "Applicant pipeline (interactions)" },
  { path: "/employer/postings", label: "Job postings" },
  { path: "/employer/profile", label: "Employer profile (forms)" },
];

for (const { path, label } of [...ADMIN_PAGES, ...EMPLOYER_PAGES]) {
  test(`a11y: ${label} — ${path}`, async ({ page }, testInfo) => {
    await auditPage(page, path, testInfo);
  });
}

test.describe("a11y: responsive (mobile viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const { path, label } of [
    { path: "/admin", label: "Admin dashboard" },
    { path: "/employer/applicants", label: "Applicant pipeline" },
  ]) {
    test(`a11y mobile: ${label} — ${path}`, async ({ page }, testInfo) => {
      await auditPage(page, path, testInfo);
    });
  }
});
