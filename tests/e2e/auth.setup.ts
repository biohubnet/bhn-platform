/**
 * Auth setup — runs ONCE before the rest of the suite and saves a
 * NextAuth session cookie to disk per role.
 *
 * Why two storage files: most flows are exercised either as a
 * trainee (registration, workshop booking) or as an admin (approval,
 * deletion, audit). Sharing one cookie across both would force every
 * spec to do role-switching via the `x` shortcut just to land in the
 * right view — slow and fragile. Two files cost ~100 ms once and let
 * each spec start in the right role.
 *
 * The cookies come from POST /api/test/e2e-sign-in (gated by
 * E2E_AUTH_SECRET + non-production VERCEL_ENV). See that route for
 * the full security argument.
 *
 * Pre-condition: the admin account must exist on the target DB (hard
 * failure otherwise). The trainee account is best-effort — if
 * `demo.attendee.trainee@biohubnet.test` (seeded by
 * `npx tsx prisma/seed-events.ts`) or `E2E_TRAINEE_EMAIL` isn't found,
 * trainee.json is simply not written and a warning is logged; specs
 * that need a trainee-authenticated view without a real seeded account
 * can act-as via POST /api/admin/act-as under the admin session instead.
 */
import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), "playwright", ".auth");

setup.beforeAll(() => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
});

setup("authenticate as trainee", async ({ request }) => {
  const email = process.env.E2E_TRAINEE_EMAIL ?? "demo.attendee.trainee@biohubnet.test";
  const res = await mintSession(request, email);
  if (res.status() === 404) {
    // No seeded/real trainee account exists on this deployment's DB — not
    // fatal. Specs needing a trainee-authenticated view (e.g. the a11y
    // audit) fall back to POST /api/admin/act-as under the admin session
    // instead, so a missing trainee.json only breaks a *trainee*-project
    // spec that genuinely needs a real trainee login (none currently do).
    console.warn(
      `[auth.setup] no trainee account for ${email} on this DB (404) — ` +
        `skipping trainee.json. Set E2E_TRAINEE_EMAIL to a real trainee, ` +
        `seed one, or use act-as for trainee-view specs.`,
    );
    return;
  }
  expect(
    res.ok(),
    `E2E sign-in failed for ${email} — status ${res.status()}. ` +
      `Make sure E2E_AUTH_SECRET is set on the target deployment and ` +
      `matches the value in this runner's env.`,
  ).toBeTruthy();
  await dismissOnboardingTour(request);
  await persistStorageState(request, "trainee");
});

setup("authenticate as admin", async ({ request }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  if (!email) {
    throw new Error(
      "E2E_ADMIN_EMAIL is not set. The admin spec needs a real admin " +
        "account on the preview DB — point this env var at one with role=admin " +
        "or role=superadmin.",
    );
  }
  const res = await mintSession(request, email);
  expect(
    res.ok(),
    `E2E sign-in failed for ${email} — status ${res.status()}. ` +
      `Make sure E2E_AUTH_SECRET is set on the target deployment and ` +
      `matches the value in this runner's env.`,
  ).toBeTruthy();
  await dismissOnboardingTour(request);
  await persistStorageState(request, "admin");
});

/**
 * Proves the consent seed above actually suppresses the banner.
 *
 * Without this, a VERSION bump in ConsentProvider would quietly stop
 * matching, the banner would come back, and the symptom would be specs
 * timing out on clicks near the bottom of the page — which reads as a
 * broken feature, not a stale constant. That misdiagnosis is the whole
 * reason this check exists: it turns drift into one named failure here
 * instead of scattered 60s timeouts downstream.
 */
setup("first-run chrome does not cover the app", async ({ browser }) => {
  const statePath = path.join(AUTH_DIR, "admin.json");
  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();
  try {
    await page.goto("/dashboard");
    const banner = page.getByRole("region", { name: /respect your privacy/i });
    await expect(
      banner,
      `The cookie banner is still showing despite the seeded consent in ` +
        `${statePath}. CONSENT_SEED.version ("${CONSENT_SEED.version}") no ` +
        `longer matches VERSION in src/components/consent/ConsentProvider.tsx — ` +
        `update it here. Left unfixed, the banner covers the bottom of the ` +
        `viewport and any spec clicking a low CTA will time out instead.`,
    ).toBeHidden();

    // The tour backdrop covers the whole viewport, so if it is up, every
    // click in every admin spec fails on actionability rather than on
    // anything the spec is actually asserting.
    // Matched by its landmark name, NOT by the backdrop's utility classes:
    // `div.fixed.inset-0.z-40` also matches unrelated drawer backdrops
    // (the sidebar keeps an md:hidden one in the DOM on every page), and
    // a count assertion cannot tell those apart from a tour that is
    // genuinely open.
    await expect(
      page.getByRole("region", { name: /product tour/i }),
      "The onboarding tour is still up despite the dismissal " +
        "PATCH in auth setup. It intercepts pointer events across the " +
        "entire viewport, so specs will hang on clicks that have nothing " +
        "to do with what they test. Check PATCH /api/onboarding still " +
        "accepts { dismissed: true } and that the auto-start guard in " +
        "Onboarding.tsx still honours it.",
    ).toBeHidden();
  } finally {
    await context.close();
  }
});

/**
 * POST to the gated auth-bypass route. Callers decide how to react to a
 * non-OK response — the trainee test treats 404 (account doesn't exist
 * on this DB) as a soft skip; the admin test always hard-fails, since a
 * missing admin account is a genuine setup problem, not an expected gap.
 */
async function mintSession(
  request: import("@playwright/test").APIRequestContext,
  email: string,
) {
  return request.post("/api/test/e2e-sign-in", {
    headers: process.env.E2E_AUTH_SECRET
      ? { "x-e2e-secret": process.env.E2E_AUTH_SECRET }
      : undefined,
    data: { email },
  });
}

/**
 * Dismiss the product tour for the account we just signed in as.
 *
 * Second piece of first-run chrome that blocks clicks, and the more
 * damaging one: the tour renders `fixed inset-0 z-40` as a backdrop
 * (Onboarding.tsx), so while it is open it swallows pointer events for
 * the ENTIRE viewport, not just the bottom strip. It auto-starts for
 * any account that has not dismissed or completed it — which is every
 * freshly seeded e2e user, on every admin route.
 *
 * That is what "delete permanently" was hanging on: Playwright logged
 * 104 retries, each one reporting the backdrop intercepting the click.
 *
 * Unlike consent this is server state, not localStorage, so seeding the
 * storage state cannot reach it — it has to be a call as the signed-in
 * user. `dismissed: true` is exactly what the Skip button sends, and
 * the auto-start guard short-circuits on it.
 *
 * Best-effort on purpose: a deployment without the route should not
 * fail auth setup. If it ever silently stops working, the guard test
 * below is what catches it.
 */
async function dismissOnboardingTour(
  request: import("@playwright/test").APIRequestContext,
) {
  try {
    await request.patch("/api/onboarding", { data: { dismissed: true } });
  } catch {}
}

/**
 * Consent payload seeded into every saved storage state.
 *
 * The cookie banner is `fixed bottom-3 z-50`, so it sits over the last
 * ~80px of the viewport. Playwright scrolls a click target to the
 * nearest edge — for anything below the fold that means the BOTTOM
 * edge, i.e. directly underneath the banner — so the click never lands
 * and the spec burns its whole timeout on actionability retries. That
 * is exactly how the symposium registration spec failed: the form
 * assertions passed, then `Request a spot` was covered by the banner.
 *
 * This is not the banner's fault and not worth working around per
 * spec — every future flow whose CTA sits low on the page would hit
 * it. Deciding consent up front means specs exercise the app instead
 * of the consent gate. The banner's own behaviour stays covered by the
 * accessibility audit, which still sees it (an undecided banner is
 * what the audit renders, and it passes: role="region" + a name).
 *
 * MUST stay in sync with ConsentProvider — `version` is compared with
 * === against its VERSION const, and a mismatch silently means "not
 * decided", which brings the banner back. Deliberately not imported
 * from src/: no test here reaches into app source, and the alias
 * resolution is not worth risking in CI for one string. The
 * assertNoConsentBanner check below is what stops drift from turning
 * into another round of mystery timeouts.
 */
const CONSENT_STORAGE_KEY = "bhn-consent";
const CONSENT_SEED = {
  necessary: true,
  analytics: false, // decline the optional ones — least surprising default
  marketing: false,
  version: "1.0", // ← ConsentProvider VERSION
  acceptedAt: "2026-01-01T00:00:00.000Z", // fixed: keeps the file stable across runs
};

/** storageState() captures cookies + localStorage; we only need cookies
 *  for NextAuth, but storing both keeps future flows compatible. */
async function persistStorageState(
  request: import("@playwright/test").APIRequestContext,
  role: "trainee" | "admin",
) {
  const outPath = path.join(AUTH_DIR, `${role}.json`);
  await request.storageState({ path: outPath });

  // request.storageState() only ever yields cookies — an APIRequestContext
  // has no DOM and therefore no localStorage — so the consent entry has to
  // be merged in by hand against the origin the suite actually runs on.
  const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001").origin;
  const state = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
    cookies: unknown[];
    origins?: { origin: string; localStorage: { name: string; value: string }[] }[];
  };
  state.origins = [
    ...(state.origins ?? []).filter((o) => o.origin !== origin),
    {
      origin,
      localStorage: [
        { name: CONSENT_STORAGE_KEY, value: JSON.stringify(CONSENT_SEED) },
      ],
    },
  ];
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
}
