/**
 * Spec — workshop booking without a symposium Registration + cross-prompt
 *
 * This is the regression-test side of the recent decoupling work
 * (commit e5f52e5). Prior to that change, /events/[slug]/me/workshops
 * redirected anyone without a confirmed Registration to /register —
 * the new policy is that tour bookings are independent of the
 * symposium day, with a banner nudging the user toward the symposium
 * registration when they don't have one.
 *
 * Strategy outline:
 *   1. Pre-flight: make sure the trainee has NO Registration on this
 *      event. The admin context deletes any if present.
 *   2. Trainee navigates directly to /events/2025-annual-symposium/me/workshops.
 *   3. Assert the cross-prompt is visible: "You're not registered for
 *      the symposium yet" + the "Add a symposium-day registration too?"
 *      CTA links back to /register.
 *   4. Trainee clicks "Request a spot" on the OmniaBio tour (or any
 *      tour with requiresApproval=true).
 *   5. Status pill flips to "Pending admin approval" + the withdraw
 *      button appears.
 *   6. The admin context navigates to that attendee's bookings page,
 *      sees the new pending row, approves it, asserts status
 *      becomes "Confirmed".
 *   7. Cleanup: cancel the booking from the admin side so the spec
 *      is re-runnable.
 */
import { test } from "@playwright/test";

test.fixme(
  "trainee books a tour without a symposium Registration; cross-prompt shows",
  async () => {
    // TODO — see strategy outline at the top of this file.
  },
);
