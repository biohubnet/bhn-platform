import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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

export const getSession = () => getServerSession(authOptions);

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Roles, ordered:
 *   user / evaluating  → learner (0)
 *   instructor         → can author courses, modules, assessments, upload SCORM (1)
 *   admin              → can manage users, enrollments, certificates, audit, settings (2)
 *   superadmin         → admin + LTI config, platform settings (3)
 */
export const ROLE_RANK: Record<string, number> = {
  user: 0,
  evaluating: 0,
  instructor: 1,
  admin: 2,
  superadmin: 3,
};

export type Role = "user" | "evaluating" | "instructor" | "admin" | "superadmin";

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
