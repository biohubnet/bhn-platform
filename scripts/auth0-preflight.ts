/**
 * Auth0 cutover preflight.
 *
 *   npx tsx scripts/auth0-preflight.ts
 *
 * Run this AFTER setting the AUTH0_* variables and BEFORE flipping the
 * environment that real users hit. It answers the question the runbook
 * cannot: "is the tenant actually configured the way this codebase
 * expects, or does it only look that way?"
 *
 * It talks to your tenant using credentials already in your environment.
 * Nothing is printed that could leak one — secrets are reported as
 * present/absent, never echoed.
 *
 * Exit code is 0 only when every check passes, so it can be wired into
 * a deploy step later if you want.
 */
import { missingAuth0Env } from "../src/lib/auth/auth0-client";

const CLAIM_NAMESPACE =
  process.env.AUTH0_CLAIM_NAMESPACE ?? "https://biohubnet.ca";

type Check = { ok: boolean; label: string; detail: string };
const checks: Check[] = [];
const pass = (label: string, detail = "") => checks.push({ ok: true, label, detail });
const fail = (label: string, detail: string) => checks.push({ ok: false, label, detail });

async function main() {
  // ── 1. Environment ──────────────────────────────────────────────
  const missing = missingAuth0Env();
  if (missing.length > 0) {
    fail(
      "Required variables",
      `missing ${missing.join(", ")} — isAuth0Enabled() is false, so the ` +
        `platform is still on the credentials provider. Nothing below can run.`,
    );
    return report();
  }
  pass("Required variables", "all five present");

  const domain = process.env.AUTH0_DOMAIN ?? "";
  const clientId = process.env.AUTH0_CLIENT_ID ?? "";
  const audience = process.env.AUTH0_AUDIENCE;
  const appBaseUrl = process.env.APP_BASE_URL ?? "";

  // A domain with a scheme is the most common paste error and produces
  // a confusing "fetch failed" much later.
  if (/^https?:\/\//.test(domain)) {
    fail("AUTH0_DOMAIN format", `should be a bare host, not a URL — got "${domain}"`);
  } else {
    pass("AUTH0_DOMAIN format", domain);
  }

  if (!/^https?:\/\//.test(appBaseUrl)) {
    fail("APP_BASE_URL format", `must include the scheme — got "${appBaseUrl}"`);
  } else {
    pass("APP_BASE_URL format", appBaseUrl);
  }

  // ── 2. Tenant reachable ─────────────────────────────────────────
  const discoveryUrl = `https://${domain.replace(/^https?:\/\//, "")}/.well-known/openid-configuration`;
  let discovery: { issuer?: string; token_endpoint?: string } | null = null;
  try {
    const res = await fetch(discoveryUrl);
    if (!res.ok) {
      fail("Tenant reachable", `${discoveryUrl} returned ${res.status}`);
    } else {
      discovery = (await res.json()) as { issuer?: string; token_endpoint?: string };
      pass("Tenant reachable", `issuer ${discovery.issuer ?? "?"}`);
    }
  } catch (e) {
    fail("Tenant reachable", `${discoveryUrl} — ${(e as Error).message}`);
  }

  // ── 3. Client + callback actually accepted ─────────────────────
  // NOT a client_credentials probe. This is a Regular Web Application
  // doing Universal Login, so its grant_types are authorization_code +
  // refresh_token by design — asking it for a client_credentials token
  // correctly returns "Grant type not allowed for the client", and
  // adding that grant just to satisfy a preflight would hand a
  // browser-facing app machine-to-machine powers it has no use for.
  // The first live run of this script failed on exactly that, and the
  // tenant was right.
  //
  // What CAN be checked without a browser is the pair that actually
  // breaks logins: is this client_id real, and is this exact
  // redirect_uri registered. Auth0 answers both on /authorize before
  // any user interacts — a good client redirects to the login page, a
  // bad one renders an error instead.
  const authorize = new URL(`https://${domain.replace(/^https?:\/\//, "")}/authorize`);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", `${appBaseUrl.replace(/\/$/, "")}/auth/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid profile email");
  if (audience) authorize.searchParams.set("audience", audience);

  try {
    const res = await fetch(authorize, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    if (res.status >= 300 && res.status < 400 && /\/u\/login|\/login/.test(location)) {
      pass("Client + callback URL", "Auth0 accepted the client_id and redirect_uri");
    } else {
      const body = await res.text();
      const reason =
        /Unauthorized|callback URL mismatch|Unknown client|invalid_request/i.exec(body)?.[0] ??
        `unexpected ${res.status}`;
      fail(
        "Client + callback URL",
        `${reason}. Check that ${appBaseUrl.replace(/\/$/, "")}/auth/callback is in the ` +
          `application's Allowed Callback URLs, and that AUTH0_CLIENT_ID matches this tenant.`,
      );
    }
  } catch (e) {
    fail("Client + callback URL", (e as Error).message);
  }

  if (!audience) {
    fail(
      "AUTH0_AUDIENCE",
      "not set. Auth0 issues an OPAQUE access token without an audience, " +
        "and RBAC permissions never appear in it. Roles would still work; " +
        "the permissions half of the requirement would not.",
    );
  } else {
    pass("AUTH0_AUDIENCE", `${audience} — permissions can appear in the token`);
  }

  // ── 4. Reminders the tenant cannot tell us about ─────────────────
  // These are dashboard settings with no API this script can read
  // without a Management API token, so they are surfaced as things to
  // confirm by eye rather than silently assumed.
  const base = appBaseUrl.replace(/\/$/, "");
  checks.push({
    ok: true,
    label: "Confirm by hand",
    detail:
      `Allowed Callback URLs must contain ${base}/auth/callback; ` +
      `Allowed Logout URLs must contain ${base}. A missing callback URL ` +
      `fails only at the end of a real login, which is a slow way to find out. ` +
      `Your Login Action must set the claims ${CLAIM_NAMESPACE}/roles and ` +
      `${CLAIM_NAMESPACE}/permissions — Auth0 silently drops custom claims ` +
      `that are not namespaced URIs, so a typo here looks like "no roles".`,
  });

  report();
}

function report() {
  const width = Math.max(...checks.map((c) => c.label.length));
  console.log("\nAuth0 preflight\n");
  for (const c of checks) {
    console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.label.padEnd(width)}  ${c.detail}`);
  }
  const failed = checks.filter((c) => !c.ok);
  console.log(
    failed.length === 0
      ? "\nAll checks passed. Two things only a real login can prove: that the " +
          "roles claim arrives, and that RBAC permissions are in the token. Sign " +
          "in once and confirm an admin reaches /admin and a trainee does not.\n"
      : `\n${failed.length} check(s) failed. Do not cut over production yet.\n`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("preflight crashed:", (e as Error).message);
  process.exit(1);
});
