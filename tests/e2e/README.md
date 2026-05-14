# E2E smoke pack (Playwright)

Six specs covering the highest-stakes user flows. The full suite runs
on every PR via `.github/workflows/e2e-playwright.yml` against the
matching Vercel preview deployment.

```
tests/e2e/
├── auth.setup.ts                                   # mints session cookies, once per role
├── symposium-registration.both.spec.ts             # ✅ FULLY WIRED
├── login.trainee.spec.ts                           # 🚧 stub
├── role-switch.trainee.spec.ts                     # 🚧 stub
├── workshop-booking-no-registration.trainee.spec.ts # 🚧 stub
├── permanent-delete-promotes-waitlist.admin.spec.ts # 🚧 stub
└── scorm-completion-credits.trainee.spec.ts        # 🚧 stub
```

Each stub has a "Strategy outline" block at the top describing what
it should assert and the pre/post-conditions needed. Fill them in one
at a time as you have bandwidth.

## How auth works

Specs do NOT log in through the UI. Instead, `auth.setup.ts` calls
the gated `/api/test/e2e-sign-in` route once per role, captures the
resulting NextAuth JWT cookie, and persists it to
`playwright/.auth/<role>.json`. Every spec inherits the matching
storage state via `playwright.config.ts`.

The auth-bypass route has three independent gates:

1. `E2E_AUTH_SECRET` env var must be set on the target deployment.
2. The incoming `x-e2e-secret` header must match it (constant-time
   compare).
3. `VERCEL_ENV` must NOT equal `"production"`.

Lose the secret → a preview is fair game (which is what E2E is for);
production main is still safe because gate 3 blocks all calls.

## Run locally

Two terminals:

```bash
# terminal 1 — preview the app
npm run dev

# terminal 2 — run the suite
export PLAYWRIGHT_BASE_URL=http://localhost:3001
export E2E_AUTH_SECRET=<any-non-empty-string>   # also set on your local .env
export E2E_ADMIN_EMAIL=<an-admin-on-your-local-db>
export E2E_TRAINEE_EMAIL=demo.attendee.trainee@biohubnet.test   # seeded by seed-events.ts

npm run test:e2e            # headless
npm run test:e2e:headed     # watch the browser
npm run test:e2e:ui         # Playwright UI mode — best for debugging
npm run test:e2e:report     # open the most recent HTML report
```

If you've never run Playwright on this machine, also do:

```bash
npx playwright install --with-deps chromium
```

## Run in CI

Configured at `.github/workflows/e2e-playwright.yml`. Triggers:

- **`pull_request` to `main`** — waits for the Vercel preview to be
  ready, then runs the full suite against that URL.
- **`workflow_dispatch`** — manual run with an optional URL override.
  Use this before promoting a hotfix to production: dispatch the
  workflow against the production alias and watch all six specs go
  green.

CI failures upload `playwright-report/` as a workflow artifact
(retention: 14 days). Each failure includes a video, trace, and
DOM snapshot — drop them into Playwright's `show-report` viewer
locally for a frame-by-frame replay.

### Secrets the workflow expects

| Secret              | Purpose                                                          |
|---------------------|------------------------------------------------------------------|
| `E2E_AUTH_SECRET`   | Must match the same env var on the target Vercel deployment.     |
| `E2E_ADMIN_EMAIL`   | An active admin or superadmin on the preview DB.                 |
| `E2E_TRAINEE_EMAIL` | (optional) Defaults to the seeded `demo.attendee.trainee@…`.     |

Add via repo Settings → Secrets and variables → Actions. Mirror the
same values into the Vercel **Preview** environment (Settings →
Environment Variables → Preview), then redeploy any open PR once so
the new env var is in scope.

## Adding a new spec

1. Pick a role: `trainee` or `admin`. The file's role suffix tells
   Playwright which storage state to load:
   - `*.trainee.spec.ts` → `playwright/.auth/trainee.json`
   - `*.admin.spec.ts`   → `playwright/.auth/admin.json`
   - `*.both.spec.ts`    → opens two `browser.newContext()`s, one per
                            role (see `symposium-registration.both.spec.ts`
                            for the pattern).
2. Make it **idempotent**. Specs run on a shared preview DB; each
   one should reset the world before AND after.
3. Prefer **role-based selectors** (`getByRole`, `getByText`) over
   raw CSS — they survive theme + layout changes.
4. Keep it under **45 seconds**. If it needs longer, split it.

## Where it stops

This is a smoke pack, not a coverage suite. It catches "is the user
flow broken end-to-end" — it does NOT catch logic regressions inside
`src/lib/**`. Pair this with Vitest on the booking / credit / skill-
match service modules when the team grows.
