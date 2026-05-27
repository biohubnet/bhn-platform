# Email setup — Resend via SMTP

This project sends transactional email via **nodemailer** over SMTP. The code path
is provider-agnostic — any SMTP server works as long as the env vars below are set.
We've picked **Resend** for production deliverability.

## Why Resend

- Better deliverability for transactional email than a generic mailbox SMTP.
- Free tier (100/day, 3000/month) covers most BHN event sizes.
- Domain verification done once via DNS records; afterwards every email
  from any sender at `@biohubnet.ca` works.
- Resend exposes an SMTP server (`smtp.resend.com:587`), so we **don't need to
  rewrite `src/lib/mail.ts`** — we just point the existing nodemailer
  transport at Resend's SMTP. Code stays exactly the same.

## One-time setup (admin)

### 1. Create a Resend account

Sign up at https://resend.com — free tier, no credit card.

### 2. Add and verify the `biohubnet.ca` domain

In the Resend dashboard → Domains → Add Domain → enter `biohubnet.ca`.

Resend will give you **three DNS records** (TXT for SPF, TXT for DKIM, and
optionally MX/DMARC). Add these to the DNS for `biohubnet.ca` wherever it's
hosted (Cloudflare, Route 53, GoDaddy, etc.). Verification usually completes
within a few minutes once DNS propagates.

> If you don't have DNS access for `biohubnet.ca`, ask whoever does — they
> just need to paste in the three records. Resend's UI walks them through it.

### 3. Generate an API key

Resend dashboard → API Keys → Create. Copy the key (starts with `re_…`).
Resend's SMTP server authenticates with username = `resend` and password = the
API key.

### 4. Set environment variables on Vercel

Production + Preview environments need these five vars:

```
SMTP_HOST   = smtp.resend.com
SMTP_PORT   = 587
SMTP_USER   = resend
SMTP_PASS   = re_…  (the API key from step 3)
SMTP_FROM   = BioHubNet <info@biohubnet.ca>
```

In Vercel dashboard → Project → Settings → Environment Variables. Add each
one for both **Production** and **Preview**, then trigger a redeploy so the
new env is picked up.

> The `SMTP_FROM` value is what recipients see in their inbox's *From* line.
> The display name (`BioHubNet`) is optional but recommended. The address
> must be at the verified domain (`@biohubnet.ca` after step 2).

### 5. (Local dev) Skip or use a sandbox

For local development you have two options:
- Leave `SMTP_*` env vars unset. The app's `mailConfigured()` helper detects
  this and silently skips email sends — registration still works end-to-end,
  the confirmation email just doesn't go out.
- Set the same vars in `.env.local` if you want to test actual sends to your
  own inbox.

## Verifying it works

Once env vars are set + the app has redeployed:

1. Go to `/events/<some-event-slug>/register` (no sign-in required).
2. Register with a real email you can access.
3. Within ~5 seconds you should receive a confirmation email at that address
   from `info@biohubnet.ca` (or whatever `SMTP_FROM` you set).

If nothing arrives:
- Check Resend dashboard → Logs for the send attempt.
- Check Vercel Function logs for any `Registration email send failed:` lines
  (the code swallows failures so the registration still succeeds even when
  email is broken).

## Existing email flows that now use this transport

All of these run through the same nodemailer → SMTP path, so configuring
Resend once enables them all:

- Event registration confirmation (user + guest)
- Admin "resend confirmation" from `/admin/events/<slug>/registrations/<rid>`
- Credit-expiry warnings (90 / 30 / 7 day lookbacks)
- Job-offer rejection notices
- Email-verification codes for the auth flow

## Switching providers later

If you ever want to move off Resend, the only thing that changes is the
five env vars on Vercel. The application code remains untouched.

## Native Resend SDK (deferred)

The Resend SDK (`resend` npm package) offers richer features — analytics,
batching, attachments, scheduled sends — but isn't needed for the
registration-confirmation path. If we later want those, we can refactor
`src/lib/mail.ts` to use the SDK without changing any call site
(the `sendMail(opts)` signature stays the same).
