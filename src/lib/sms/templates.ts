/**
 * SMS reminder templates. Short by design — every template targets
 * ≤ 160 characters so it lands as a single segment ($0.0075 per
 * send on US/Canada via Twilio at time of writing). Longer bodies
 * fragment into 2+ segments at 153 chars each, each billed
 * separately.
 *
 * The cron only sends SMS for the 1-day and 1-hour reminder kinds —
 * the 1-week reminder is email-only since SMS at that distance
 * isn't materially more useful than the email.
 */

export type SmsReminderKind = "one_day" | "one_hour";

export interface SmsReminderInput {
  kind: SmsReminderKind;
  eventTitle: string;
  /** Local time as a short string e.g. "tomorrow 7 PM" or
   *  "starts in 60 min". */
  whenSummary: string;
  /** Online → meeting URL; in-person → venue name. The template
   *  picks whichever is most useful for the kind. */
  venueOrMeeting: string | null;
  /** Short URL back to the event landing page or success page. */
  shortLink: string;
}

/**
 * Format a reminder SMS body. Always under 160 chars when fields
 * stay reasonable (event titles up to ~40 chars).
 */
export function renderReminderSms(input: SmsReminderInput): string {
  if (input.kind === "one_hour") {
    const venuePart = input.venueOrMeeting ? `\n${input.venueOrMeeting}` : "";
    return `BHN: ${input.eventTitle} starts in ~1hr.${venuePart}\nDetails + QR: ${input.shortLink}`;
  }
  // one_day
  const venuePart = input.venueOrMeeting ? `\nWhere: ${input.venueOrMeeting}` : "";
  return `BHN reminder: ${input.eventTitle} is ${input.whenSummary}.${venuePart}\nYour pass: ${input.shortLink}`;
}
