/**
 * Auth0 tenant provisioner — everything the cutover needs, scripted.
 *
 *   npm run auth0:provision -- --dry-run     # show what would change
 *   npm run auth0:provision                  # apply
 *   npm run auth0:provision -- --import-users
 *
 * Reads AUTH0_MGMT_DOMAIN / AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET
 * from the environment. Those belong to a Machine-to-Machine app that has
 * to be created by hand in the Auth0 Dashboard, because authorising the
 * FIRST M2M app is circular: POST /api/v2/client-grants itself needs a
 * token carrying create:client_grants. Everything downstream of that one
 * manual step is automated here.
 *
 * Idempotent. Every step checks for an existing object first, so re-running
 * after a partial failure is safe and is the intended recovery path.
 *
 * Secrets are never printed. The generated application's client secret is
 * written to .auth0-provision.local (gitignored) for you to paste into
 * Vercel.
 *
 * Required M2M scopes:
 *   create:clients read:clients update:clients read:client_keys
 *   create:resource_servers read:resource_servers update:resource_servers
 *   create:roles read:roles update:roles
 *   create:actions read:actions update:actions
 *   create:users read:users read:connections
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");
const DO_USERS = process.argv.includes("--import-users");

const DOMAIN = req("AUTH0_MGMT_DOMAIN");
const MGMT_ID = req("AUTH0_MGMT_CLIENT_ID");
const MGMT_SECRET = req("AUTH0_MGMT_CLIENT_SECRET");
const APP_BASE_URL = (process.env.APP_BASE_URL ?? "https://biohubnet.vercel.app").replace(/\/$/, "");
const CLAIM_NS = process.env.AUTH0_CLAIM_NAMESPACE ?? "https://biohubnet.ca";
const API_IDENTIFIER = process.env.AUTH0_AUDIENCE ?? "https://api.biohubnet.ca";
const APP_NAME = "BHN Training Platform";
const ACTION_NAME = "BHN roles and permissions";

/** Roles the platform gates on — ROLE_RANK in src/lib/auth.ts. */
const ROLES = [
  "trainee", "evaluating", "employer", "hr", "industrial_mentor",
  "engage_hqp_advisor", "equip_grant_reviewer", "instructor",
  "admin", "superadmin",
];

function req(k: string): string {
  const v = process.env[k];
  if (!v) {
    console.error(
      `\nMissing ${k}.\n\n` +
        `This script needs a Machine-to-Machine app that you create once in the\n` +
        `Auth0 Dashboard (Applications -> Create -> Machine to Machine, authorised\n` +
        `for the Auth0 Management API). Authorising the first M2M app cannot be\n` +
        `scripted — the call to do it needs a token only an authorised app can mint.\n\n` +
        `Then: export AUTH0_MGMT_DOMAIN / AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET\n`,
    );
    process.exit(1);
  }
  return v;
}

let token = "";
async function api<T>(method: string, p: string, body?: unknown, raw?: FormData): Promise<T> {
  const res = await fetch(`https://${DOMAIN}/api/v2${p}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(raw ? {} : { "content-type": "application/json" }),
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message?: unknown }).message)
        : text.slice(0, 300);
    throw new Error(`${method} ${p} -> ${res.status}: ${msg}`);
  }
  return parsed as T;
}

const log = (s: string) => console.log(`  ${s}`);
const step = (s: string) => console.log(`\n${s}`);

async function getToken() {
  // audience MUST be the canonical tenant domain with a trailing slash —
  // a custom domain here returns "Bad audience". `scope` is deliberately
  // omitted: the client grant defines what this token carries, and asking
  // for a subset behaves inconsistently.
  const res = await fetch(`https://${DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: MGMT_ID,
      client_secret: MGMT_SECRET,
      audience: `https://${DOMAIN}/api/v2/`,
    }),
  });
  const body = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`token request failed: ${body.error_description ?? res.status}`);
  }
  token = body.access_token;
}

/** ── API (resource server) with RBAC + permissions in the token ────── */
async function ensureApi() {
  step("API / resource server");
  const all = await api<{ id: string; identifier: string }[]>("GET", "/resource-servers?per_page=100");
  const found = all.find((r) => r.identifier === API_IDENTIFIER);
  if (found) { log(`exists: ${API_IDENTIFIER}`); return; }
  if (DRY) { log(`would create: ${API_IDENTIFIER}`); return; }

  await api("POST", "/resource-servers", {
    name: "BHN Platform API",
    identifier: API_IDENTIFIER,
    // enforce_policies alone does NOT put permissions in the token; the
    // token_dialect is what does it. Setting one without the other is the
    // single most common reason "roles work but permissions are empty".
    enforce_policies: true,
    token_dialect: "access_token_authz",
    // The Management API defaults signing_alg to HS256 while the Dashboard
    // defaults to RS256. Scripted creation must say so explicitly or you
    // get a symmetric-signed API that behaves differently from a
    // hand-made one.
    signing_alg: "RS256",
  });
  log(`created: ${API_IDENTIFIER} (RBAC on, access_token_authz, RS256)`);
}

/** ── Roles ─────────────────────────────────────────────────────────── */
async function ensureRoles() {
  step("Roles");
  const existing = await api<{ id: string; name: string }[]>("GET", "/roles?per_page=100");
  const have = new Set(existing.map((r) => r.name));
  for (const name of ROLES) {
    if (have.has(name)) { log(`exists: ${name}`); continue; }
    if (DRY) { log(`would create: ${name}`); continue; }
    await api("POST", "/roles", { name, description: `BHN platform role: ${name}` });
    log(`created: ${name}`);
  }
}

/** ── The web application ───────────────────────────────────────────── */
async function ensureClient(): Promise<{ clientId: string; secret: string } | null> {
  step("Application");
  const all = await api<{ client_id: string; name: string }[]>("GET", "/clients?per_page=100&fields=client_id,name&include_fields=true");
  let clientId = all.find((c) => c.name === APP_NAME)?.client_id;

  const urls = {
    callbacks: [`${APP_BASE_URL}/auth/callback`, "http://localhost:3001/auth/callback"],
    allowed_logout_urls: [APP_BASE_URL, "http://localhost:3001"],
    web_origins: [APP_BASE_URL, "http://localhost:3001"],
  };

  if (clientId) {
    log(`exists: ${APP_NAME}`);
    if (!DRY) { await api("PATCH", `/clients/${clientId}`, urls); log("urls updated"); }
  } else if (DRY) {
    log(`would create: ${APP_NAME} (regular_web)`); return null;
  } else {
    // app_type is exactly "regular_web" — not "regular_web_app"/"web".
    // Both request schemas are additionalProperties:false, so any typo is
    // a hard 400 rather than a silently ignored field. That is the good case.
    const created = await api<{ client_id: string }>("POST", "/clients", {
      name: APP_NAME,
      app_type: "regular_web",
      grant_types: ["authorization_code", "refresh_token"],
      oidc_conformant: true,
      ...urls,
    });
    clientId = created.client_id;
    log(`created: ${APP_NAME}`);
  }
  if (DRY || !clientId) return null;

  // client_secret is not part of the create RESPONSE — it has to be read
  // back explicitly, and needs read:client_keys.
  const full = await api<{ client_id: string; client_secret?: string }>("GET", `/clients/${clientId}`);
  if (!full.client_secret) throw new Error("client_secret not returned — token is missing read:client_keys");
  return { clientId, secret: full.client_secret };
}

/** ── Post-login Action: the roles + permissions claims ─────────────── */
async function ensureAction() {
  step("Login Action");
  const code = `exports.onExecutePostLogin = async (event, api) => {
  const ns = "${CLAIM_NS}";
  api.idToken.setCustomClaim(ns + "/roles", event.authorization?.roles ?? []);
  api.idToken.setCustomClaim(ns + "/permissions", event.authorization?.permissions ?? []);
};`;

  const triggers = await api<{ id: string; version: string; status: string }[]>("GET", "/actions/triggers")
    .then((r) => (Array.isArray(r) ? r : (r as unknown as { triggers: { id: string; version: string; status: string }[] }).triggers));
  // Discover the CURRENT post-login version rather than pinning "v3".
  // Pinning survives a v4 release unchanged; discovery keeps working. The
  // deprecated versions still accept bindings, so a stale pin fails silently.
  const postLogin = triggers.filter((t) => t.id === "post-login");
  const trig = postLogin.find((t) => t.status === "CURRENT") ?? postLogin[0];
  if (!trig) throw new Error("no post-login trigger found");
  log(`trigger: post-login ${trig.version} (${trig.status})`);

  const existing = await api<{ actions: { id: string; name: string }[] }>("GET", "/actions/actions?triggerId=post-login");
  let actionId = existing.actions?.find((a) => a.name === ACTION_NAME)?.id;

  if (DRY) { log(actionId ? `would update: ${ACTION_NAME}` : `would create + deploy + bind: ${ACTION_NAME}`); return; }

  if (!actionId) {
    const made = await api<{ id: string }>("POST", "/actions/actions", {
      name: ACTION_NAME,
      supported_triggers: [{ id: "post-login", version: trig.version }],
      code,
      runtime: "node22",
    });
    actionId = made.id;
    log("created");
  } else {
    await api("PATCH", `/actions/actions/${actionId}`, { code });
    log("code updated");
  }

  // An action must finish BUILDING before it can be deployed or bound.
  // Skipping this poll is a documented, recurring failure in Auth0's own
  // Terraform provider — the create returns 201 while the build is still
  // pending, and the next call fails for no obvious reason.
  for (let i = 0; i < 30; i++) {
    const a = await api<{ status: string }>("GET", `/actions/actions/${actionId}`);
    if (a.status === "built") break;
    if (a.status === "failed") throw new Error("action build failed");
    await new Promise((r) => setTimeout(r, 1000));
  }
  await api("POST", `/actions/actions/${actionId}/deploy`, {});
  log("deployed");

  // PATCH bindings is a FULL REPLACE of the trigger's ordered list, not an
  // append. Sending only this action would silently unbind every other
  // post-login action in the tenant — the one call here that can destroy
  // existing configuration while returning 200.
  const current = await api<{ bindings: { id: string; display_name: string; action: { id: string; name: string } }[] }>(
    "GET", "/actions/triggers/post-login/bindings",
  );
  const others = (current.bindings ?? []).filter((b) => b.action?.name !== ACTION_NAME);
  const next = [
    ...others.map((b) => ({ ref: { type: "action_id" as const, value: b.action.id }, display_name: b.display_name })),
    { ref: { type: "action_id" as const, value: actionId }, display_name: ACTION_NAME },
  ];
  await api("PATCH", "/actions/triggers/post-login/bindings", { bindings: next });
  log(`bound (preserved ${others.length} existing binding(s))`);
}

/** ── Users ─────────────────────────────────────────────────────────── */
async function importUsers() {
  step("User import");
  const prisma = new PrismaClient();
  const rows = await prisma.$queryRawUnsafe<{ email: string; password: string | null; name: string | null }[]>(
    `SELECT email, password, name FROM "User" WHERE password IS NOT NULL AND email NOT LIKE '%@example.com' ORDER BY email`,
  );
  await prisma.$disconnect();

  // Only $2a$/$2b$/$2y$ are accepted. Anything else is rejected per-record,
  // and a rejected record does NOT fail the job — see the errors poll below.
  const users = rows
    .filter((u) => /^\$2[aby]\$/.test(u.password ?? ""))
    .map((u) => ({
      email: u.email.toLowerCase(),
      // Explicit and load-bearing: Auth0 force-resets email_verified to
      // false on import unless the record says otherwise, and this codebase
      // refuses a login whose token carries email_verified:false. Omitting
      // this locks out every account you just migrated.
      email_verified: true,
      ...(u.name ? { name: u.name } : {}),
      custom_password_hash: {
        algorithm: "bcrypt",
        // `salt` is a SIBLING of `hash`, not nested inside it — and for a
        // standard $2b$ string the salt is already embedded, so it is
        // omitted entirely. custom_password_hash is additionalProperties:
        // false, so an extra key here is a hard validation failure.
        hash: { value: u.password },
      },
    }));

  log(`${rows.length} candidate row(s), ${users.length} importable`);
  if (users.length !== rows.length) {
    log(`SKIPPED ${rows.length - users.length} with a non-bcrypt hash — those need a password reset instead`);
  }
  if (DRY) { log("would import (dry run)"); return; }
  if (users.length === 0) return;

  const conns = await api<{ id: string; name: string; strategy: string }[]>("GET", "/connections?strategy=auth0");
  const conn = conns[0];
  if (!conn) throw new Error("no database connection found in the tenant");
  log(`connection: ${conn.name}`);

  const form = new FormData();
  form.append("users", new Blob([JSON.stringify(users)], { type: "application/json" }), "users.json");
  form.append("connection_id", conn.id);
  form.append("upsert", "true");
  // Defaults to TRUE and emails every tenant owner on each job.
  form.append("send_completion_email", "false");
  const job = await api<{ id: string }>("POST", "/jobs/users-imports", undefined, form);
  log(`job ${job.id} submitted`);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const s = await api<{ status: string; summary?: { failed: number; inserted: number; updated: number } }>("GET", `/jobs/${job.id}`);
    if (s.status === "completed" || s.status === "failed") {
      log(`status ${s.status}${s.summary ? ` — inserted ${s.summary.inserted}, updated ${s.summary.updated}, failed ${s.summary.failed}` : ""}`);
      // "completed" does NOT mean every user imported: invalid records fail
      // individually without failing the job. Checking this is mandatory.
      const errs = await api<unknown>("GET", `/jobs/${job.id}/errors`);
      if (errs) {
        const list = Array.isArray(errs) ? errs : [errs];
        if (list.length) {
          log(`${list.length} record error(s):`);
          for (const e of list.slice(0, 10)) log(`   ${JSON.stringify(e).slice(0, 200)}`);
        }
      } else {
        log("no record errors");
      }
      return;
    }
  }
  log("job still pending after 2 minutes — check the Auth0 dashboard");
}

async function main() {
  console.log(`\nAuth0 provision — tenant ${DOMAIN}${DRY ? "  [DRY RUN]" : ""}`);
  await getToken();
  await ensureApi();
  await ensureRoles();
  const client = await ensureClient();
  await ensureAction();
  if (DO_USERS) await importUsers();

  if (client) {
    const out = path.join(process.cwd(), ".auth0-provision.local");
    fs.writeFileSync(
      out,
      [
        `AUTH0_DOMAIN=${DOMAIN}`,
        `AUTH0_CLIENT_ID=${client.clientId}`,
        `AUTH0_CLIENT_SECRET=${client.secret}`,
        `AUTH0_AUDIENCE=${API_IDENTIFIER}`,
        `APP_BASE_URL=${APP_BASE_URL}`,
        `# AUTH0_SECRET — generate with: openssl rand -hex 32`,
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    step("Next");
    log(`Wrote ${path.basename(out)} (gitignored, chmod 600). Not printed here on purpose.`);
    log(`Add those to Vercel preview, plus AUTH0_SECRET, then: npm run auth0:preflight`);
  }
  console.log("");
}

main().catch((e) => {
  console.error(`\nfailed: ${(e as Error).message}\n`);
  process.exit(1);
});
