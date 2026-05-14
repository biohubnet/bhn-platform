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
 * Pre-condition: both target users must exist on the preview DB.
 * Production data has the admin; the trainee is seeded by
 * `npx tsx prisma/seed-events.ts` (demo.attendee.trainee@biohubnet.test).
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
  await mintSession(request, email, "trainee");
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
  await mintSession(request, email, "admin");
});

/**
 * POST to the gated auth-bypass route and persist the resulting
 * cookie jar to disk for the role's storage state.
 */
async function mintSession(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  role: "trainee" | "admin",
) {
  const res = await request.post("/api/test/e2e-sign-in", {
    headers: process.env.E2E_AUTH_SECRET
      ? { "x-e2e-secret": process.env.E2E_AUTH_SECRET }
      : undefined,
    data: { email },
  });
  expect(
    res.ok(),
    `E2E sign-in failed for ${email} — status ${res.status()}. ` +
      `Make sure E2E_AUTH_SECRET is set on the target deployment and ` +
      `matches the value in this runner's env.`,
  ).toBeTruthy();

  // storageState() captures cookies + localStorage; we only need cookies
  // for NextAuth, but storing both keeps future flows compatible.
  const outPath = path.join(AUTH_DIR, `${role}.json`);
  await request.storageState({ path: outPath });
}
