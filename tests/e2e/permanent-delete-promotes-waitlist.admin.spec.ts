/**
 * Spec — permanent-delete a registration promotes the next waitlister
 *
 * Coverage rationale: the cancel-cascade-with-waitlist-promotion
 * code path (cancelRegistration in src/lib/events/bookings.ts) is
 * the highest-stakes piece of mutation logic in the events module.
 * Mis-promotion (skipping a waitlister, or promoting two at once)
 * doesn't fail visibly — the wronged attendee just shows up at the
 * event and discovers they have no seat. This spec asserts:
 *
 *   1. Pre-condition state on a workshop with no remaining seats:
 *      • N confirmed bookings (N = capacity)
 *      • At least 1 waitlist booking, position 1
 *      • Identify the waitlister's email.
 *   2. As admin, hard-delete the registration of any one confirmed
 *      attendee on that workshop.
 *   3. After the delete:
 *      • The waitlister's WorkshopBooking flips from waitlist → confirmed
 *      • Their waitlistPosition becomes null
 *      • The "Pending approval" tile count is unchanged (no new pending
 *        rows were created by the cascade)
 *   4. Cleanup: undo any state changes so the spec is idempotent.
 *
 * Best run against a freshly-seeded preview DB (the cl3-tour-am
 * workshop seeds 10 confirmed + 2 waitlist by default — perfect
 * starting state for this assertion).
 */
import { test } from "@playwright/test";

test.fixme(
  "deleting a confirmed registration promotes the first waitlister",
  async () => {
    // TODO — see strategy outline at the top of this file.
  },
);
