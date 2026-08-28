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
  const clientSecret = process.env.AUTH0_CLIENT_SECRET ?? "";
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

  // ── 3. Credentials valid ────────────────────────────────────────
  // A client_credentials grant is the only way to prove the id/secret
  // pair without a browser. It needs an audience, which is the same
  // thing RBAC permissions need — so a tenant that cannot do this
  // cannot deliver permissions either.
  if (!audience) {
    fail(
      "AUTH0_AUDIENCE",
      "not set. Auth0 issues an OPAQUE access token without an audience, " +
        "and RBAC permissions never appear in it. Roles would still work; " +
        "the permissions half of the requirement would not.",
    );
  } else if (discovery?.token_endpoint) {
    try {
      const res = await fetch(discovery.token_endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          audience,
        }),
      });
      const body = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
      if (!res.ok || !body.access_token) {
        fail(
          "Client credentials",
          body.error_description ?? body.error ?? `token endpoint returned ${res.status}`,
        );
      } else {
        pass("Client credentials", "client_id + client_secret accepted");
        inspectToken(body.access_token);
      }
    } catch (e) {
      fail("Client credentials", (e as Error).message);
    }
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

/** Look for the permissions claim RBAC is supposed to add. */
function inspectToken(accessToken: string) {
  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    // Opaque token — exactly what "no audience" produces.
    fail("Access token format", "opaque, not a JWT — RBAC permissions cannot be read from it");
    return;
  }
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    const perms =
      typeof payload === "object" && payload !== null && "permissions" in payload
        ? (payload as { permissions?: unknown }).permissions
        : undefined;
    if (Array.isArray(perms)) {
      pass("RBAC permissions in token", `${perms.length} permission(s) present`);
    } else {
      fail(
        "RBAC permissions in token",
        "no `permissions` claim. Enable RBAC AND 'Add Permissions in the " +
          "Access Token' on the API in the Auth0 dashboard.",
      );
    }
  } catch {
    fail("Access token format", "could not decode the JWT payload");
  }
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
      ? "\nAll checks passed. The roles claim still needs a real login to verify — " +
          "sign in once on preview and confirm an admin account reaches /admin.\n"
      : `\n${failed.length} check(s) failed. Do not cut over production yet.\n`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("preflight crashed:", (e as Error).message);
  process.exit(1);
});
