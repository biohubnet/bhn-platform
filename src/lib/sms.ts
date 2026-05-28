/**
 * Twilio SMS helper.
 *
 * Mirrors `src/lib/mail.ts` — lazy client, configured-or-noop
 * predicate, swallow-failures pattern so a misconfigured Twilio
 * doesn't break the cron run.
 *
 * Env vars expected:
 *   TWILIO_ACCOUNT_SID    — AC…
 *   TWILIO_AUTH_TOKEN     — secret
 *   TWILIO_FROM_NUMBER    — purchased Twilio phone number in E.164,
 *                           e.g. "+15145551234"
 *
 * Until these are set, `smsConfigured()` returns false and the
 * reminder cron silently skips SMS dispatch. Email reminders still
 * fire from the same cron pass.
 */
import twilio from "twilio";

let cached: ReturnType<typeof twilio> | null = null;

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export function smsConfigured(): boolean {
  return Boolean(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER);
}

function client() {
  if (cached) return cached;
  if (!smsConfigured()) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.",
    );
  }
  cached = twilio(ACCOUNT_SID!, AUTH_TOKEN!);
  return cached;
}

/**
 * Send a single SMS. Phone must be E.164 ("+14165551234"). Body
 * should fit in 160 chars to avoid the multi-segment surcharge —
 * the templates in src/lib/sms/templates.ts are tuned to land
 * under that.
 */
export async function sendSms(opts: { to: string; body: string }) {
  await client().messages.create({
    from: FROM_NUMBER!,
    to: opts.to,
    body: opts.body,
  });
}

/**
 * Lightweight E.164 validation. Doesn't check that the number is
 * reachable — just that the shape is right. Accepts numbers with or
 * without the leading `+` and normalises to include it.
 *
 * Returns null when the input doesn't look like E.164. The
 * registration API uses this to drop bogus inputs at write-time so
 * the cron doesn't waste Twilio attempts on malformed numbers.
 */
export function toE164(raw: string): string | null {
  const cleaned = raw.replace(/[\s()\-.]/g, "");
  // Require + or just digits; total 7–15 digits.
  const m = cleaned.match(/^\+?(\d{7,15})$/);
  if (!m) return null;
  return `+${m[1]}`;
}
