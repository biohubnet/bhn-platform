import { NextRequest, NextResponse } from "next/server";
import { claimEmailVerification } from "@/lib/security/email-verify";

/**
 * GET /api/auth/verify-email/[token] — verify the user's email by
 * claiming a token. Idempotent: the token stays live until its 7-day
 * expiry, so re-hitting it (email-security pre-fetch, double-click,
 * refresh) returns the same 200, not a 404. Renders no UI — the
 * /verify-email/[token] page route is the friendly landing; this
 * endpoint is for any caller that wants a JSON response.
 *
 * Tokens come from the registration flow (issueAndSendEmailVerification).
 */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "invalid-token" }, { status: 400 });
  }
  const result = await claimEmailVerification(token);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: result.reason === "expired" ? 410 : 404 }
    );
  }
  return NextResponse.json({ ok: true, email: result.email });
}
