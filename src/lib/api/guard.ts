/**
 * Route guards that return a response instead of throwing.
 *
 * `requireSession` and `requireRole` in lib/auth THROW — "Unauthorized"
 * and "Forbidden" respectively. That is a fine contract, and 312 API
 * routes handle it with `.catch(() => null)`. But 85 routes across 47
 * files called them bare, and an uncaught throw in a Next route handler
 * is a 500 with an empty body. Verified on production before this
 * landed: GET /api/admin/stats and /api/admin/audit answered 500 to an
 * unauthenticated caller, while their guarded siblings answered
 * 401 {"error":"Unauthorized"}.
 *
 * Access was still denied in every case — this was never a bypass — but
 * a client cannot tell "your session expired" from "the server broke",
 * and every unauthenticated scan logged a function exception, burying
 * real 500s in bot noise.
 *
 * These helpers return either the session or a NextResponse, so a call
 * site stays two lines and keeps `const`:
 *
 *   const session = await guardRole("admin");
 *   if (session instanceof NextResponse) return session;
 *
 * The instanceof check narrows, so `session` is fully typed afterwards.
 *
 * They also preserve the distinction `.catch(() => null)` throws away:
 * a role failure is 403, not 401. The existing 312 sites answer 401 to
 * both; they are left alone rather than retrofitted, since changing a
 * status code a client may branch on is a separate decision.
 */
import { NextResponse } from "next/server";
import { requireSession, requireRole } from "@/lib/auth";

/** Map a thrown auth error onto the right status. */
export function authErrorResponse(e: unknown): NextResponse {
  const forbidden = e instanceof Error && e.message === "Forbidden";
  return NextResponse.json(
    { error: forbidden ? "Forbidden" : "Unauthorized" },
    { status: forbidden ? 403 : 401 },
  );
}

/** Session, or a 401 to return immediately. */
export async function guardSession() {
  try {
    return await requireSession();
  } catch (e) {
    return authErrorResponse(e);
  }
}

/** Session, or a 401/403 to return immediately. */
export async function guardRole(minRole: "instructor" | "admin" | "superadmin") {
  try {
    return await requireRole(minRole);
  } catch (e) {
    return authErrorResponse(e);
  }
}
