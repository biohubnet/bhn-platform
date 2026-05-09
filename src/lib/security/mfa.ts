/**
 * TOTP (RFC 6238) helpers — Google Authenticator-compatible.
 *
 * Uses otplib for the math + qrcode-svg for the inline QR (svg
 * string, no canvas / image runtime needed). Secret stored on
 * User.totpSecret in base32; we ship a clearly-labelled row-
 * encryption upgrade path in docs/security/encryption-posture.md.
 *
 * Why TOTP over WebAuthn for v1: every authenticator app already
 * supports TOTP; no hardware-key purchase decision; lower IT-team
 * support load. WebAuthn / passkey is the next-natural step but
 * doesn't have to be in this batch.
 */
import { authenticator } from "otplib";
import QRCode from "qrcode-svg";

// 30-second window, ±1 step tolerance — handles minor clock skew
// without opening a real attack window.
authenticator.options = { window: 1, step: 30 };

const ISSUER = "BHN Training";

/**
 * Generate a fresh base32 secret. ~80-bit entropy, fine for TOTP
 * (the underlying HMAC-SHA1 limits practical attack surface).
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * RFC 6238 verify — ±1 30-s window. Returns true when `code`
 * (a 6-digit string) matches the secret at any acceptable timestep.
 */
export function verifyTotp(secret: string, code: string): boolean {
  // Trim non-digits the user might have typed (spaces, hyphens).
  const cleanCode = code.replace(/\D/g, "");
  if (cleanCode.length !== 6) return false;
  try {
    return authenticator.verify({ token: cleanCode, secret });
  } catch {
    return false;
  }
}

/**
 * Build the otpauth:// URI an authenticator app reads. The label
 * shows up in the user's authenticator as "BHN Training:user@x.com"
 * so they can tell BHN entries apart from other accounts.
 */
export function totpAuthUri(opts: { email: string; secret: string }): string {
  return authenticator.keyuri(opts.email, ISSUER, opts.secret);
}

/**
 * Render the otpauth URI as an SVG QR code (string). Embed inline
 * via dangerouslySetInnerHTML — never write the user's secret into
 * the DOM as a query string or attribute.
 */
export function totpQrSvg(uri: string): string {
  return new QRCode({
    content: uri,
    padding: 1,
    width: 200,
    height: 200,
    color: "#0f172a",
    background: "#ffffff",
    ecl: "M",
  }).svg();
}
