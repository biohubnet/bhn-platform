/**
 * Short-lived, HMAC-signed access grants for SCORM package assets.
 *
 * The problem this solves: a real Storyline / Captivate course is
 * hundreds of files, and every one of them is fetched from
 * /scorm-files/<courseId>/... . Checking entitlement per asset the
 * obvious way — session lookup plus an enrollment query — turns a
 * cohort launching together into thousands of database round trips.
 *
 * So entitlement is established ONCE, at launch, by a route that does
 * the real check against the database, and is then carried by a signed
 * cookie scoped to that course's asset path. The asset route verifies a
 * signature and an expiry; it never touches the database. The browser
 * attaches the cookie to every relative asset request on its own, which
 * is what makes this work with a package's own internal links — those
 * are relative and cannot be made to carry a token in a query string.
 *
 * The grant proves ONE thing: at time T, this user was entitled to open
 * this course. It deliberately expires, so a withdrawn or declined
 * learner loses access on their next launch rather than keeping a
 * permanent key. It is not a session and must never be treated as one —
 * it authorises reading one course's static assets, nothing else.
 */
import { createHmac, timingSafeEqual } from "crypto";

/** How long a launch grant stays good. Long enough for the longest
 *  plausible sitting with a course open (packages fetch assets lazily
 *  as the learner advances, so this has to outlive the whole session,
 *  not just the initial load), short enough that revoking someone's
 *  enrollment takes effect within the same working day. */
export const GRANT_TTL_SECONDS = 8 * 60 * 60;

export function grantCookieName(courseId: string): string {
  return `bhn_scorm_${courseId}`;
}

/** Cookie path. Scoping to the course's own asset prefix means the
 *  browser sends it ONLY on that course's requests — a grant for one
 *  course is never even transmitted while browsing another. */
export function grantCookiePath(courseId: string): string {
  return `/scorm-files/${courseId}`;
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) {
    // Fail closed. A missing secret must not degrade to "everyone gets
    // in" — that is precisely the bug this file exists to fix.
    throw new Error("NEXTAUTH_SECRET is required to sign SCORM access grants");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Mint a grant. `expiresAt` is epoch seconds, carried in the value so
 *  the verifier needs no state — and covered by the signature, so it
 *  cannot be extended by editing the cookie. */
export function issueGrant(userId: string, courseId: string, nowMs: number): string {
  const exp = Math.floor(nowMs / 1000) + GRANT_TTL_SECONDS;
  const payload = `${userId}.${courseId}.${exp}`;
  return `${exp}.${sign(payload)}`;
}

/** Verify a grant for this user + course. Returns false for anything
 *  malformed, expired, or signed with a different secret. */
export function verifyGrant(
  value: string | undefined,
  userId: string,
  courseId: string,
  nowMs: number,
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;

  const exp = Number(value.slice(0, dot));
  const provided = value.slice(dot + 1);
  if (!Number.isSafeInteger(exp) || exp * 1000 <= nowMs) return false;

  const expected = sign(`${userId}.${courseId}.${exp}`);
  // Constant-time compare. Lengths must match first — timingSafeEqual
  // throws on a length mismatch rather than returning false.
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
