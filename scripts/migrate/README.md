# Platform migration runbook — Vercel + Neon + R2 → new accounts

Move the BHN platform to a new Vercel team, Neon project, and Cloudflare R2
bucket (all under `info@biohubnet.ca`). Vercel is stateless; **Neon and R2 hold
live data**, so they migrate first and the app's env vars flip last.

> Secrets stay local. Put connection strings / keys in a local `.env.migrate`
> (gitignored) and `source` it — never paste them into a PR or chat.

## The one thing that used to be scary, now isn't

File URLs are stored absolutely in the DB (`r2PublicUrl(key)` bakes in the
host). A bucket with a different public host would orphan every stored URL.
**Fix already shipped:** set `R2_LEGACY_PUBLIC_URLS` to the OLD host on the new
deployment and every legacy URL keeps resolving — `lib/r2.ts` recognises it.
So a host change no longer needs a DB rewrite. (If you instead keep the same
custom domain by re-pointing it at the new bucket, you don't even need this.)

## 0. Provision (you create the accounts)

New Vercel team, new Neon project (same Postgres major version — check the old
one with `SELECT version();`), new Cloudflare account + R2 bucket + an API
token (access key + secret).

## 1. Database — Neon

Use the **direct** (unpooled) endpoints for dump/restore; the `-pooler` host
chokes on bulk restore.

```bash
source .env.migrate   # OLD_DIRECT_URL, NEW_DIRECT_URL, old/new R2 creds…

pg_dump "$OLD_DIRECT_URL" -Fc -f bhn.dump --no-owner --no-privileges
pg_restore -d "$NEW_DIRECT_URL" --no-owner --no-privileges bhn.dump

# sanity
psql "$NEW_DIRECT_URL" -c "\dt" -c "SELECT count(*) FROM \"User\";"
```

## 2. Files — R2 (rclone, S3 API)

Configure two remotes (`oldr2`, `newr2`) with each account's keys and endpoint
`https://<account_id>.r2.cloudflarestorage.com`, then:

```bash
rclone sync oldr2:OLD_BUCKET newr2:NEW_BUCKET --transfers 16 --checkers 32 --progress
```

`sync` is idempotent — re-run it at cutover to catch new uploads (fast delta).

## 3. Know where the URLs live (verify completeness)

```bash
psql "$OLD_DIRECT_URL" -f scripts/migrate/audit-r2-url-columns.sql
```

Lists every column holding an R2 URL. With `R2_LEGACY_PUBLIC_URLS` you don't
have to touch these — but you should know what they are.

## 4. New Vercel project

1. Import the same GitHub repo into the new team (grant its GitHub app access).
2. Recreate env vars (see disposition table in chat). Key ones:
   - `DATABASE_URL`, `DIRECT_URL` → new Neon
   - `R2_*` → new bucket/token
   - `R2_LEGACY_PUBLIC_URLS` → the OLD `R2_PUBLIC_URL` (unless you re-pointed a
     custom domain at the new bucket, in which case leave it empty)
   - `NEXTAUTH_SECRET` → copy as-is (changing it logs everyone out)
   - `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` → final domain
   - everything else (`SMTP_*`, `GEMINI_API_KEY`, `STRIPE_*`, `TWILIO_*`,
     `MAILCHIMP_*`, `TURNSTILE_*`, `GOOGLE_CLIENT_*`, `CRON_SECRET`,
     `CF_*`, `SENTRY_DSN`) → copy as-is unless you're also moving that service.
3. Deploy to a **preview URL** and smoke-test before touching the domain.
4. `vercel.json` crons (`daily-maintenance`, `event-reminders`) ride along;
   ensure `CRON_SECRET` is set.

## 5. Cutover (the freeze window — how you avoid losing writes)

1. Put the OLD app in maintenance / announce a short freeze.
2. Final delta: re-run `pg_dump`/`restore` (or data-only) **and** `rclone sync`.
3. Move the custom domain off the old Vercel project onto the new one; update
   DNS if needed.
4. Set the final-domain env vars on the new project; redeploy.
5. If the domain changed, update Google OAuth authorised redirect URIs.

## 6. Verify, then decommission

- Log in (proves Neon + `NEXTAUTH_SECRET`).
- Open an EQUIP application **with an uploaded document** (proves R2 + the
  legacy-URL resolution).
- Send a test email; confirm a cron fires.
- Leave the OLD stack **paused, not deleted**, ~1 week as rollback insurance.
