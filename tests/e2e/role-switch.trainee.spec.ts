/**
 * Spec — `x` / `xx` keyboard role switch
 *
 * Why this matters: the double-tap shortcut (x = toggle trainee,
 * xx = toggle HR/employer) was added so admins can sanity-check both
 * views without logging out. A regression here is invisible until a
 * support ticket says "I can't see what the employer sees" — by which
 * point the customer has already lost trust.
 *
 * Strategy outline:
 *   1. Sign in as admin (already done by setup project for this
 *      project's storage state).
 *   2. Press `x` once → role chip flips to "trainee" (act-as cookie
 *      set). Assert sidebar items match trainee permissions.
 *   3. Press `x` again → back to admin.
 *   4. Double-tap `x` (within 320 ms) → role chip flips to "employer".
 *   5. Press `x` once → clears act-as, back to admin.
 *
 * Note: the storage state for this project is `admin.json` (set in
 * playwright.config.ts), so this spec belongs in admin-chromium.
 * Renaming the file to `*.admin.spec.ts` is correct, but keeping the
 * `.trainee.spec.ts` suffix lets us assert "an admin acting as a
 * trainee" — the more interesting case.
 */
import { test } from "@playwright/test";

test.fixme("x toggles trainee view; xx toggles HR view", async () => {
  // TODO — see strategy outline at the top of this file.
});
