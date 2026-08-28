# Auth0 Universal Login — migration runbook

The code is in place. What remains is tenant setup and a user import,
both of which need Auth0 credentials and therefore have to be done by
someone with access to the account.

Nothing in this document changes behaviour until the environment
variables in step 4 are set. Until then the platform keeps using the
existing credentials provider, and `isAuth0Enabled()` returns false.

## How the switch works

`src/lib/auth.ts` exports `getSession()` / `requireSession()` /
`requireRole()`. 519 modules import that file; only 19 touch `next-auth`
directly. So the identity provider is a decision about who *answers*
those calls, not a change to the callers.

```
getRawSession()
  ├─ isAuth0Enabled()  →  auth0Session()        ← Auth0 Universal Login
  └─ otherwise         →  getServerSession(...)  ← credentials provider
```

`isAuth0Enabled()` is true only when **every** required variable is
present. There is no partially-enabled state: a half-configured tenant
cannot lock anyone out.

Rollback is the same switch in reverse — unset one variable, redeploy.
No code change in either direction.

## 1. Create the tenant and application

1. Create an Auth0 tenant (or use an existing one).
2. Create a **Regular Web Application**.
3. In its settings, set:
   - **Allowed Callback URLs** — `https://<your-domain>/auth/callback`
   - **Allowed Logout URLs** — `https://<your-domain>`
   - **Allowed Web Origins** — `https://<your-domain>`

Add the preview and local equivalents too if you want Auth0 on those:
`http://localhost:3001/auth/callback` and the Vercel preview domain.

The `/auth/*` routes are mounted by `src/proxy.ts`, not by route files.
That is how the v4 SDK works — if you delete the proxy, the callback
404s and login fails with no obvious cause.

## 2. Enable RBAC, so "roles and permissions" is real

1. **Applications → APIs** — create an API, note its identifier. This
   becomes `AUTH0_AUDIENCE`.
2. On that API, enable **RBAC** and **Add Permissions in the Access
   Token**. Without an audience Auth0 issues an opaque access token and
   permissions never appear, so this step is what makes the permissions
   half work.
3. Create the roles matching the platform's own set. The ranks live in
   `ROLE_RANK` in `src/lib/auth.ts`:

   | Role | Rank |
   |---|---|
   | `trainee`, `evaluating`, `employer`, `hr`, `industrial_mentor` | 0 |
   | `engage_hqp_advisor`, `equip_grant_reviewer`, `instructor` | 1 |
   | `admin` | 2 |
   | `superadmin` | 3 |

4. Add a **Login Action** that puts roles and permissions into the ID
   token as namespaced claims. Auth0 silently drops un-namespaced
   custom claims:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const ns = "https://biohubnet.ca";
     api.idToken.setCustomClaim(`${ns}/roles`, event.authorization?.roles ?? []);
     api.idToken.setCustomClaim(`${ns}/permissions`, event.authorization?.permissions ?? []);
   };
   ```

   Override the namespace with `AUTH0_CLAIM_NAMESPACE` if your tenant
   already uses a different one.

**Role precedence is Auth0 first, database second.** A role claim wins
when present; the database role is the fallback. That ordering is
deliberate — it keeps the platform usable while the Action is being
rolled out, instead of demoting every user to the default role the
moment Auth0 goes live.

## 3. Import existing users

Users are matched on **verified email**, which every existing row has,
so accounts link on first login with no schema change and no backfill.

The stored password hashes are bcrypt, which Auth0's bulk import
accepts directly — so people keep their current passwords and never see
a reset email. The column is `User.password` (NOT `passwordHash`, which
does not exist), and the hashes carry the `$2b$` prefix.

There are currently **5 users, 4 of them with a password**, so this is a
small hand-checkable import rather than a migration project. Export
`email` + `password` and use **User Management → Import Users**:

```json
[{ "email": "…", "email_verified": true,
   "custom_password_hash": { "algorithm": "bcrypt",
                             "hash": { "value": "$2b$…" } } }]
```

`email_verified` must be `true` in the import file. The code refuses a
login whose token says `email_verified: false`, so importing without it
locks out every account you just moved.

Two things to know:

- Users whose email is **not verified in Auth0** are refused. Identity
  and role both hang off the address, so accepting an unverified one
  would let anyone who can claim that address inherit the account.
- A user who authenticates but has **no row in this database** is
  refused by default. Set `AUTH0_JIT_PROVISION=true` to create rows on
  first login instead, and `AUTH0_JIT_DEFAULT_ROLE` to pick the role
  they get (defaults to `trainee`). Left off deliberately: this
  platform grants real capability by role, and silently creating
  accounts for anyone who can authenticate to the tenant is a
  different security posture than the one it has today.

## 4. Set the environment variables

On Vercel, for the environment you are cutting over:

| Variable | Value |
|---|---|
| `AUTH0_DOMAIN` | `your-tenant.us.auth0.com` |
| `AUTH0_CLIENT_ID` | from the application settings |
| `AUTH0_CLIENT_SECRET` | from the application settings |
| `AUTH0_SECRET` | 32+ random bytes — `openssl rand -hex 32` |
| `APP_BASE_URL` | `https://<your-domain>` |
| `AUTH0_AUDIENCE` | the API identifier from step 2 (needed for permissions) |

Optional: `AUTH0_CLAIM_NAMESPACE`, `AUTH0_JIT_PROVISION`,
`AUTH0_JIT_DEFAULT_ROLE`.

Then, before pointing real users at it:

```bash
npm run auth0:preflight
```

It checks the five variables, reaches your tenant's OIDC discovery
document, proves the client id/secret pair with a client-credentials
grant, and decodes the resulting token to confirm RBAC permissions
actually appear in it. It never prints a secret. Exit code is 0 only
when everything passes.

It cannot see your dashboard settings, so it prints the two it can't
check — Allowed Callback URLs and Allowed Logout URLs — for you to
confirm by eye. A missing callback URL only fails at the very end of a
real login, which is a slow way to find out.

Redeploy. `isAuth0Enabled()` flips on the next boot.

Do this on **preview first**. Verify a real login end to end there
before touching production.

## 5. Verify after cutover

- Sign in through Universal Login; land on `/dashboard`.
- An admin account still reaches `/admin` — confirms the role claim is
  arriving and mapping correctly.
- A trainee account is still refused at `/admin` — confirms
  `requireRole` is gating on the Auth0-supplied role, not defaulting
  everyone upward.
- Superadmin act-as still switches roles (`/api/admin/act-as`). It
  reads the raw session and is provider-independent, but it is the one
  place that reasons about roles outside `getSession()`.
- Sign out clears the session.

## What the app already does on cutover

No code change is needed at the switch — these are wired and tested:

- **`/login` and `/register` redirect to Universal Login.** Handled in
  `src/proxy.ts`, before React renders, so there is no flash of the
  credentials form. NextAuth's `callbackUrl` is translated to Auth0's
  `returnTo` (which the SDK sanitises against the app base URL).
- **Sign-out goes to the right provider.** `useSignOut()` in
  `src/lib/auth/authProvider.tsx` routes to `/auth/logout` under Auth0
  and to NextAuth's `signOut()` otherwise. Calling the wrong one leaves
  the session alive while the UI says it ended, which is why the flag is
  passed down from the server rather than mirrored into a
  `NEXT_PUBLIC_` variable that could disagree.
- **The access rules are unit-tested** without a tenant —
  `tests/unit/auth0-session.test.ts` covers the refusal table
  (unverified email, no email, no local account, JIT ordering), role
  precedence, permission mapping, and malformed-claim handling.

## Known gaps

- **`/api/test/e2e-sign-in` mints a NextAuth JWT.** The e2e suite
  depends on it. It keeps working while the credentials provider is
  live; after full cutover the suite needs an Auth0-issued session
  instead, or that route needs to keep its own signing path.
- **TOTP MFA** currently lives in the credentials provider. Auth0 has
  its own MFA, so after cutover it should be configured in the tenant
  rather than in this codebase.
- **`next-auth` is still a dependency.** It stays until cutover is
  complete on every environment; removing it earlier would delete the
  fallback that makes rollback a config change.
