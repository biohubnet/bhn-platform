import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const ACT_AS_COOKIE = "bhn-act-as";

const DAY = 24 * 60 * 60;
const LONG_SESSION = 30 * DAY;
const SHORT_SESSION = 1 * DAY;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt", maxAge: LONG_SESSION },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.password) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        // Optional email-verification gate. When BHN_REQUIRE_EMAIL_VERIFY
        // is true, sign-in fails for unverified accounts. We let
        // demo / sandbox accounts through unconditionally — they
        // bypass the verification flow on purpose. Returning null
        // here surfaces as "Invalid email or password" which is
        // intentionally vague (don't leak whether an account is
        // verified vs whether the password is wrong); the dashboard
        // banner + /verify-email pages exist for the friendly UX.
        const requireVerify =
          (process.env.BHN_REQUIRE_EMAIL_VERIFY ?? "").toLowerCase() === "true";
        const accountKind = (user as { accountKind?: string | null }).accountKind ?? "real";
        if (
          requireVerify &&
          accountKind === "real" &&
          !user.emailVerified
        ) {
          return null;
        }
        // Pass the remember flag through to the JWT callback
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          remember: credentials.remember !== "false",
        } as unknown as { id: string; email: string; name: string | null; role: string };
      },
    }),
    // Passwordless sign-in. The /api/auth/send-code route emails a
    // 6-digit code; this provider verifies it. Single-use — the row is
    // deleted on success. attempts caps brute force at 5.
    CredentialsProvider({
      id: "email-code",
      name: "email-code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const code = credentials?.code?.trim();
        if (!email || !code || !/^\d{6}$/.test(code)) return null;
        const row = await prisma.loginCode.findFirst({
          where: { email, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (!row) return null;
        if (row.attempts >= 5) {
          await prisma.loginCode.delete({ where: { id: row.id } }).catch(() => {});
          return null;
        }
        const ok = await bcrypt.compare(code, row.codeHash);
        if (!ok) {
          await prisma.loginCode.update({
            where: { id: row.id },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }
        // Success — burn the code so it can't be reused.
        await prisma.loginCode.delete({ where: { id: row.id } }).catch(() => {});
        // Also clear any other live codes for this email.
        await prisma.loginCode.deleteMany({ where: { email } }).catch(() => {});
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          remember: true,
        } as unknown as { id: string; email: string; name: string | null; role: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "user";
        token.id = user.id;
        const remember = (user as { remember?: boolean }).remember;
        if (remember === false) {
          token.shortSession = true;
          token.exp = Math.floor(Date.now() / 1000) + SHORT_SESSION;
        } else {
          token.shortSession = false;
        }
      }
      // Honor exp on subsequent calls so JWT effectively has shorter lifespan when shortSession is set
      if (trigger === "update" && token.shortSession) {
        token.exp = Math.floor(Date.now() / 1000) + SHORT_SESSION;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};

/** Raw session — never modified for impersonation. Use for auth on
 *  endpoints that toggle the act-as cookie itself. */
export const getRawSession = () => getServerSession(authOptions);

/**
 * getSession(). If the caller is a superadmin and has an active
 * `bhn-act-as` cookie, the returned session.user.role reflects the
 * impersonated role while session.user.realRole keeps the true role
 * and session.user.actingAs flags that we're in view-as mode.
 *
 * This means requireRole("admin") will (correctly) fail when a
 * superadmin is viewing as a trainee — so the experience is faithful.
 */
export async function getSession() {
  const session = await getRawSession();
  if (!session) return null;
  const realRole = (session.user as { role?: string }).role;
  (session.user as { realRole?: string }).realRole = realRole;
  if (realRole === "superadmin") {
    try {
      const actAs = (await cookies()).get(ACT_AS_COOKIE)?.value;
      if (actAs && actAs !== "superadmin" && ROLE_RANK[actAs] !== undefined) {
        (session.user as { role?: string }).role = actAs;
        (session.user as { actingAs?: string }).actingAs = actAs;
      }
    } catch {
      // cookies() can throw outside a request scope — ignore.
    }
  }
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Roles, ordered:
 *   trainee / evaluating → learner (0)        [legacy alias: 'user']
 *   instructor           → authors courses (1)
 *   admin                → manages users, audit, settings (2)
 *   superadmin           → admin + LTI, platform settings (3)
 */
export const ROLE_RANK: Record<string, number> = {
  user: 0,        // legacy
  trainee: 0,
  evaluating: 0,
  employer: 0,    // outside the learner-staff progression — gated separately
  instructor: 1,
  admin: 2,
  superadmin: 3,
};

export type Role = "trainee" | "evaluating" | "employer" | "instructor" | "admin" | "superadmin";

/** Is this account an employer (HR partner who posts jobs / reviews applicants)? */
export function isEmployer(role: string) {
  return role === "employer";
}

export async function requireRole(minRole: "instructor" | "admin" | "superadmin") {
  const session = await requireSession();
  const userRole = (session.user as { role?: string }).role ?? "user";
  const required = ROLE_RANK[minRole] ?? ROLE_RANK.admin;
  const actual = ROLE_RANK[userRole] ?? 0;
  if (actual < required) throw new Error("Forbidden");
  return session;
}

/** Admin or higher — manages users, audit, settings. */
export function isAdmin(role: string) {
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK["admin"];
}

/** Instructor or higher — authors courses. */
export function isStaff(role: string) {
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK["instructor"];
}

/**
 * Confirm the calling user has authoring rights over this specific
 * course. Used by mutation endpoints under /api/courses/[id]/* to
 * prevent one instructor from defacing another's course (the kind of
 * IDOR that surfaced in the May-2026 Canvas incident: low-privilege
 * authenticated account reaching resources it doesn't own).
 *
 * Returns the session on success. Throws on unauthorized / forbidden.
 *
 * Authorisation matrix:
 *   • The course's `instructorId` matches the caller       → allow
 *   • The caller is admin or superadmin                    → allow
 *     (so platform staff can still moderate / ghost-edit)
 *   • Otherwise                                            → deny (403)
 */
export async function requireCourseOwner(courseId: string) {
  const session = await requireSession();
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "user";
  if (!userId) throw new Error("Unauthorized");

  // Admins / superadmins skip the ownership check.
  if (isAdmin(role)) return { session, userId, role, isOwner: false, isAdminOverride: true };

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) throw new Error("Forbidden"); // Don't leak existence to non-owners.
  if (course.instructorId !== userId) throw new Error("Forbidden");
  return { session, userId, role, isOwner: true, isAdminOverride: false };
}
