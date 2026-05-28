# SMS reminders — Twilio setup

The platform sends two SMS reminders per event when opt-in is on:

- **1 day before** — "BHN reminder: <title> is tomorrow at 7 PM…"
- **1 hour before** — "BHN: <title> starts in ~1hr…"

Both are short (≤ 160 chars → single Twilio segment) and include a
link back to the registration success page so the recipient can pull
up the QR code.

## Setup checklist

### 1. Create a Twilio account
At [twilio.com](https://twilio.com). Free trial credit covers
~600 sends in US/Canada at $0.0075 each.

### 2. Buy a phone number
Twilio Console → Phone Numbers → Buy a number. Pick one with
SMS capability in your country. Canadian and US local numbers are
~$1/month and the cheapest per-send rate.

### 3. Get your credentials
Console → Account → API keys & tokens → copy:
- **Account SID** (`AC…`)
- **Auth Token** (the master one)

### 4. Set env vars on Vercel

For both Production and Preview:

```
TWILIO_ACCOUNT_SID  = AC…
TWILIO_AUTH_TOKEN   = <token>
TWILIO_FROM_NUMBER  = +15145551234   (the number you bought, E.164)
```

Trigger a redeploy.

## How attendees opt in

The public registration form has a **"Text me 1 day and 1 hour before
the event"** checkbox. When ticked, a phone field appears — they enter
their mobile number with country code (e.g. `+1 416 555 1234`).

Server-side, the phone is normalised to E.164 and stored only if valid.
Bogus numbers (typos, missing country code with no leading +) are
silently dropped — the registration still succeeds, the SMS just won't
fire.

## What the cron does

`/api/cron/event-reminders` runs every 15 minutes. For each
non-cancelled registration:
- Always sends the email reminder (if SMTP is configured)
- Additionally sends SMS for `one_day` and `one_hour` reminders when:
  - Twilio is configured (env vars set)
  - `Registration.smsOptIn` is true
  - A phone is on file (either `Registration.guestPhone` for guests
    or `User.phone` for signed-in users)

SMS failures are logged but don't gate the email. If Twilio is down
the email still goes out.

## Costs

US/Canada outbound SMS via Twilio is **$0.0075 per segment** at time
of writing. Templates are designed to fit in one segment. Add up to
$1/month per phone number you bought.

For a 100-attendee event with 60% SMS opt-in, the cost per event is
~60 attendees × 2 reminders × $0.0075 = **$0.90**.

## What's NOT supported

- **Inbound SMS** (reply STOP, reply HELP). Twilio's STOP keyword
  handling works automatically for transactional templates but we
  don't currently surface those replies anywhere.
- **MMS / images**
- **International tier pricing** (everything above assumes US/Canada;
  other regions vary)
- **Per-event SMS budgets** — admins can't cap spend per event yet
- **Per-attendee SMS preferences page** — opt-in is collected at
  registration time and not changeable afterward without an admin

These are all small additions if proven necessary.
