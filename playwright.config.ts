import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the BHN Training Platform E2E smoke pack.
 *
 * Two project groups:
 *   • `setup`           — runs auth.setup.ts once, persists storage state
 *                          per role to playwright/.auth/<role>.json.
 *   • `<role>-chromium` — actual test specs, each project depending on
 *                          setup and loading the matching storage state.
 *
 * Why role-scoped storage state
 * ─────────────────────────────
 * Most flows are tested as either a trainee (registration, workshop
 * booking) or an admin (approve, delete, audit). Running the email-
 * code login UI before every spec is fragile + slow; instead the
 * setup project hits POST /api/test/e2e-sign-in (gated, see route
 * source) once per role, captures the resulting session cookie, and
 * every spec inherits it.
 *
 * Where it runs
 * ─────────────
 * Local: BASE_URL=http://localhost:3001 + `next dev` running in another
 *        terminal, or use --webServer below.
 * CI:    BASE_URL=<Vercel preview URL> populated by the e2e-playwright
 *        GitHub Actions workflow; no webServer needed (the preview is
 *        already serving).
 *
 * Failures upload the HTML report + per-spec trace + screenshot via
 * the CI workflow's actions/upload-artifact step — that's the
 * "what broke" trail you share with reviewers.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const isCi = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  /** Tests touching shared registration/workshop state can't run in
   *  parallel against the same preview DB without flakes. */
  fullyParallel: false,
  workers: isCi ? 1 : 2,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["list"],
      ]
    : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    /** Some helpers want to call API endpoints directly. */
    extraHTTPHeaders: process.env.E2E_AUTH_SECRET
      ? { "x-e2e-secret": process.env.E2E_AUTH_SECRET }
      : undefined,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "trainee-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/trainee.json",
      },
      dependencies: ["setup"],
      testMatch: /\.(trainee|both)\.spec\.ts/,
    },
    {
      name: "admin-chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /\.(admin|both)\.spec\.ts/,
    },
  ],
});
