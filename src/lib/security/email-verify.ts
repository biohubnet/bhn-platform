/**
 * Email-verification helpers. Issues a 256-bit token, persists it on
 * the User row with a 7-day expiry, and sends a verification link.
 *
 * Two operating modes (controlled by `BHN_REQUIRE_EMAIL_VERIFY`):
 *   • "advisory" (default) — verification link is sent; users can
 *     still sign in if they ignore it. UI shows a "verify your email"
 *     banner. Useful while leadership / CASL compliance is being
 *     finalised.
 *   • "required" — sign-in is blocked until emailVerified is set.
 *     Flip this once SMTP is configured in production and we're ready
 *     to require verification from new accounts.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendMail, mailConfigured } from "@/lib/mail";

export const REQUIRE_EMAIL_VERIFY =
  (process.env.BHN_REQUIRE_EMAIL_VERIFY ?? "").toLowerCase() === "true";

/** Days before a verification link stops working. */
const TOKEN_TTL_DAYS = 7;

function appBaseUrl(): string {
  // Prefer NEXTAUTH_URL (set in production), then VERCEL_URL (preview),
  // then localhost (dev). Trim trailing slash for clean concat.
  const fromEnv = process.env.NEXTAUTH_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? "http://localhost:3001";
  return fromEnv.replace(/\/$/, "");
}

/**
 * Mint a fresh email-verification token for a user, persist it, and
 * send the verification email. Returns true if the email was sent;
 * false if SMTP isn't configured (caller may surface "we'll resend
 * once email is wired up" rather than fail registration).
 */
export async function issueAndSendEmailVerification(opts: {
  userId: string;
  email: string;
  name: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const token = randomBytes(32).toString("hex"); // 256 bits
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: opts.userId },
    data: {
      emailVerifyToken: token,
      emailVerifyExpires: expires,
    },
  });

  if (!mailConfigured()) {
    return { sent: false, reason: "smtp-not-configured" };
  }

  const link = `${appBaseUrl()}/verify-email/${token}`;
  const greet = opts.name ? `Hi ${opts.name},` : "Hi,";
  const subject = "Verify your BHN Training email";
  const text = [
    greet,
    "",
    "Please confirm this is your email address by clicking the link below. The link is valid for 7 days.",
    "",
    link,
    "",
    "If you didn't sign up for BHN Training, you can ignore this message — no account will be created without confirmation.",
    "",
    "— BHN Training",
  ].join("\n");
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: auto; padding: 24px; color: #1e293b;">
      <p>${greet}</p>
      <p>Please confirm this is your email address. The link is valid for 7 days.</p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #0ea5e9; color: white; padding: 10px 20px; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block;">Verify my email</a>
      </p>
      <p style="font-size: 12px; color: #64748b; word-break: break-all;">Or paste this URL into your browser:<br/>${link}</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
        If you didn't sign up for BHN Training, you can ignore this message.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">— BHN Training</p>
    </div>
  `;

  try {
    await sendMail({ to: opts.email, subject, text, html });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

/**
 * Claim an email-verification token: mark the user verified.
 *
 * TRULY IDEMPOTENT — the token is intentionally NOT cleared on success.
 * It stays resolvable until its natural 7-day expiry, and an already-
 * verified user short-circuits to success. This matters because
 * corporate email security (Microsoft Defender "Safe Links", Proofpoint,
 * etc.) PRE-FETCHES the link to scan it — which, with the old
 * clear-on-first-use behaviour, burned the single-use token before the
 * recipient ever clicked, so their real click hit "Link not recognised".
 *
 * Re-hitting the link only ever re-stamps `emailVerified` (already set);
 * the token is not a login credential and grants no session or
 * privilege, so keeping it live until expiry is harmless. A later
 * resend mints a new token and overwrites this one, invalidating the
 * old link.
 */
export async function claimEmailVerification(token: string): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: "not-found" | "expired" }
> {
  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
  if (!user) return { ok: false, reason: "not-found" };

  // Already verified (scanner pre-fetch, double-click, refresh, browser
  // prefetch) → idempotent success on the same token.
  if (user.emailVerified) {
    return { ok: true, userId: user.id, email: user.email };
  }
  if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
    return { ok: false, reason: "expired" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() }, // keep token + expiry live for idempotency
  });
  return { ok: true, userId: user.id, email: user.email };
}
