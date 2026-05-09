# Encryption posture

**Date:** 9 May 2026

## Summary

| Layer | Encryption | Algorithm | Notes |
|---|---|---|---|
| **In transit (browser → BHN)** | ✅ TLS 1.2+ | Cipher suite negotiated by Vercel edge; modern (ECDHE + AES-GCM or ChaCha20) | HSTS auto-set by Vercel; `Strict-Transport-Security` header forces HTTPS |
| **In transit (BHN → Postgres)** | ✅ TLS | Mandated by Neon; connection string requires `sslmode=require` | Failure mode: connection refused if SSL not negotiated |
| **In transit (BHN → R2)** | ✅ TLS 1.2+ | AWS S3 SDK over HTTPS | Cloudflare R2 enforces TLS-only |
| **In transit (BHN → Cloudflare AI)** | ✅ TLS | HTTPS to api.cloudflare.com / Workers AI gateway | |
| **In transit (BHN → SMTP)** | ✅ STARTTLS or TLS 1.2+ | Per `SMTP_PORT`: 587 (STARTTLS) or 465 (implicit) | nodemailer enforces |
| **At rest (Postgres)** | ✅ AES-256 | Neon-managed | Per Neon: "All data is encrypted at rest" |
| **At rest (R2)** | ✅ AES-256 | Cloudflare-managed | Per Cloudflare R2 docs |
| **At rest (Vercel build artifacts / logs)** | ✅ AES-256 | Vercel-managed | Per Vercel security overview |
| **At rest (Postgres backups)** | ✅ AES-256 | Same encryption as primary; PITR + WAL log encrypted | Neon-managed |
| **Application-layer (passwords)** | ✅ bcrypt @ work-factor 12 | bcryptjs library | Salt per password; rotate work-factor when hardware advances make 12 cheap |
| **Application-layer (TOTP secrets)** | ⚠️ Plain in DB | base32-encoded shared secret | Documented upgrade path below |
| **Application-layer (magic-link tokens)** | ✅ Random 256-bit, single-use | crypto.randomBytes(32) | Hashed in DB? — no, stored plain (single-use; brief lifetime) |
| **Application-layer (email-verify tokens)** | ✅ Random 256-bit, 7-day expiry, single-use | crypto.randomBytes(32) | Same |
| **Cookies / sessions** | ✅ Signed JWT | jose library; HMAC-SHA256 | NextAuth-managed; secret in `NEXTAUTH_SECRET` env |

## Key custody

- **NEXTAUTH_SECRET** — JWT signing key. Stored in Vercel env (encrypted at rest by Vercel). Rotated on incident only.
- **R2 access keys** — `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`. Stored in Vercel env. Scoped to a specific R2 bucket. Rotation not yet automated; manual via Cloudflare dashboard.
- **Postgres connection string** — `DATABASE_URL`. Stored in Vercel env. Includes credentials.
- **Cloudflare AI key** — Workers AI binding via Cloudflare account API token. Stored in Vercel env.
- **TOTP secrets** — stored in `User.totpSecret` column as base32. **See upgrade path below.**
- **SMTP password** — stored in Vercel env `SMTP_PASS`.

All Vercel env vars are AES-256 encrypted at rest in Vercel's KMS-backed config store.

## Known weaker spots and upgrade paths

### 1. TOTP secrets in plain DB columns
Today: `User.totpSecret` is a base32 string in clear text in Postgres.
Risk if DB is compromised: an attacker with the DB dump has both the user's password hash (still bcrypt-12 protected) AND the TOTP secret, defeating MFA on those accounts.
**Mitigation today**: Postgres at-rest encryption + restricted DB credentials + audit log of any direct DB access (none today, but documentable).
**Upgrade path**: row-level encryption using a KMS key (e.g., GCP KMS, Cloudflare's KMS-equivalent, AWS KMS). Encrypt the secret with a master key BHN holds in environment, never in the DB. Decrypt on read inside the Node process. Effort: ~1 week.

### 2. Magic-link tokens stored plain
Today: `User.magicToken` and `User.emailVerifyToken` are stored as base64/hex strings in Postgres.
Risk: a DB compromise hands the attacker any in-flight unused tokens.
**Mitigation today**: tokens are short-lived (7-day expiry on email verify; magic links typically used within minutes); single-use enforced.
**Upgrade path**: store SHA-256 hashes of tokens; compare hashed input on verification. Effort: ~2 days.

### 3. R2 bucket public-readable
Today: R2_PUBLIC_URL is publicly readable; URLs include 128-bit cryptographic random tokens making them computationally unguessable.
Risk: a leaked URL stays valid forever.
**Mitigation today**: token-in-path makes URLs unguessable; orphan-cleanup deletes replaced files.
**Upgrade path**: signed URLs (primitive already in `src/lib/r2.ts` — `getSignedR2GetUrl`). Set `R2_USE_SIGNED_URLS=true` and flip the bucket private. Effort: ops decision + 1 day to wire all consumers.

## Encryption keys are NOT shared

Cloudflare, Neon, and Vercel each manage their own encryption-at-rest keys via their respective KMS systems. No customer-held keys today.

**Bring-Your-Own-Key (BYOK)** is on the roadmap if an enterprise customer requires it; not implemented today.

## Change log

| Date | Change |
|---|---|
| 2026-05-09 | Initial draft. Document the gaps. |
