/**
 * Cloudflare Turnstile (https://developers.cloudflare.com/turnstile/)
 * verifier. Free, GDPR-friendly, no third-party tracking.
 *
 * Flow:
 *   1. Client renders the Turnstile widget with NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 *   2. Widget produces a one-time token; client posts that with the form.
 *   3. Server calls verifyTurnstile(token, ip) before doing the
 *      sensitive action (register, login, magic-link request, etc.).
 *
 * Both env vars are optional — if NEXT_PUBLIC_TURNSTILE_SITE_KEY is
 * unset, the client doesn't render the widget and the server skips
 * verification. That keeps local dev and preview deploys frictionless;
 * leadership flips it on for production via Vercel env vars.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_ENABLED = Boolean(process.env.TURNSTILE_SECRET_KEY);

interface VerifyResult {
  ok: boolean;
  /** Cloudflare's machine-readable error codes (see Turnstile docs).
   *  Used by callers that want to log specific failure modes. */
  errorCodes?: string[];
}

/**
 * Verify a Turnstile token. Returns ok: true on success OR if Turnstile
 * isn't configured (so the registration flow doesn't break in preview /
 * local environments where the secret isn't set). Callers can read
 * TURNSTILE_ENABLED if they want to require verification explicitly.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<VerifyResult> {
  if (!TURNSTILE_ENABLED) return { ok: true };
  if (!token || typeof token !== "string") {
    return { ok: false, errorCodes: ["missing-token"] };
  }
  const body = new URLSearchParams();
  body.set("secret", process.env.TURNSTILE_SECRET_KEY!);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // The free Turnstile endpoint is a hot path; fail closed on a
      // network blip rather than allowing a sketchy registration to
      // proceed. The 5-second timeout is generous for what's normally
      // a sub-100ms response.
      signal: AbortSignal.timeout(5000),
    });
    const j = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    return {
      ok: !!j.success,
      errorCodes: j["error-codes"],
    };
  } catch (e) {
    return { ok: false, errorCodes: ["fetch-failed:" + (e as Error).message] };
  }
}

/**
 * Best-effort client-IP extraction. Vercel runs behind their edge
 * proxy, so the standard request.ip is sometimes the proxy not the
 * client; fall back to the canonical "x-forwarded-for" header (first
 * entry, which is the original caller).
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}
