/**
 * Spec — SCORM module completion lands a credit transaction
 *
 * Why this matters: SCORM completion is the main mechanism that
 * mints credits in the trainee's wallet, which then unlock merch
 * tier rewards (MerchReward). Two pieces of glue have to fire in
 * sequence — the scorm-again player has to post a completion
 * verb, the LMS has to settle that into a CreditTransaction, and
 * the trainee dashboard has to reflect the new balance.
 *
 * Strategy outline:
 *   1. Pre-condition: trainee is enrolled in a known demo SCORM
 *      course (seed-biomanufacturing.ts or seed-changelog.ts has
 *      these). Capture the starting credit balance.
 *   2. Open the module, scroll the player to "Complete" state.
 *      scorm-again exposes `cmi.core.lesson_status="completed"` — the
 *      easiest hook is the player's "Mark complete" button.
 *   3. Navigate back to the dashboard / credit wallet.
 *   4. Assert: new CreditTransaction appears in the recent list,
 *      balance increased by the course's credit value, course shows
 *      "Completed" on the enrolment row.
 *   5. Cleanup: roll back the completion + credit transaction via
 *      a test-only admin endpoint, OR accept that this spec is
 *      "one-shot per seed-cycle" and re-seed the preview DB between
 *      CI runs.
 *
 * Lower priority than the events specs above — SCORM regressions
 * tend to be more visible (a stuck "in progress" pill is loud).
 */
import { test } from "@playwright/test";

test.fixme("SCORM completion mints a CreditTransaction and updates wallet", async () => {
  // TODO — see strategy outline at the top of this file.
});
