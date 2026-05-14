/**
 * Spec — login + logout
 *
 * Coverage gap: the rest of the suite signs in via the gated
 * /api/test/e2e-sign-in route, which is fast but skips the real
 * UI. This one spec exercises the actual login form so a regression
 * in the email-code flow doesn't slip past CI.
 *
 * Strategy outline (fill in when wiring up):
 *   1. Open /login.
 *   2. Submit the email field with E2E_TRAINEE_EMAIL.
 *   3. Read the just-issued LoginCode from the DB via a small
 *      test-only API route (TODO: add /api/test/last-login-code,
 *      same gating as /api/test/e2e-sign-in).
 *   4. Submit the 6-digit code.
 *   5. Land on /dashboard, role chip = "trainee".
 *   6. Click logout, land on /login.
 *
 * Reason this one isn't fully written yet: the test-only "read the
 * last login code" route doesn't exist. Adding it is small but
 * deserves its own review pass for the security gating.
 */
import { test } from "@playwright/test";

test.fixme("trainee logs in via email code, sees dashboard, logs out", async () => {
  // TODO — see strategy outline at the top of this file.
});
