/**
 * Demo magic-link landing.
 *
 *   /employer/demo/[token]
 *
 * The link itself is the credential. Clicking it:
 *   1. Validates the demo invite + that it hasn't expired
 *   2. Spawns the populated workspace (first visit) OR looks up the
 *      existing demo employer (return visit — link is reusable until
 *      it expires, so the prospect can come back later without re-auth)
 *   3. Mints a NextAuth JWT scoped to the invite's expiry
 *   4. Sets the session cookie and redirects to /employer
 *
 * Zero clicks, zero forms, zero copy-paste. The visitor lands in the
 * populated employer dashboard already authenticated.
 *
 * If the invite is expired or invalid, we render a small explainer
 * with a link back to /for-employers.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import Link from "next/link";
import { Clock, Sparkles, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { spawnDemoWorkspace } from "@/lib/demo/workspace";
import { LogoMark } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export default async function DemoTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.employerInvite.findUnique({ where: { token } });
  if (!invite || !invite.demoMode) {
    return <BadLink kind="invalid" />;
  }
  if (invite.expiresAt < new Date()) {
    return <BadLink kind="expired" />;
  }

  // First visit: spawn the workspace; subsequent visits: re-use the
  // already-claimed employer so the link works as a returnable bookmark.
  let employerId: string | null = invite.usedById;
  if (employerId) {
    // Make sure the claimed employer still exists (sweeper might have
    // killed it). If not, fall through to a fresh spawn below.
    const exists = await prisma.user.findUnique({
      where: { id: employerId },
      select: { id: true, accountKind: true },
    });
    if (!exists || exists.accountKind !== "demo") employerId = null;
  }

  if (!employerId) {
    const result = await spawnDemoWorkspace({
      email: invite.email,
      companyName: invite.companyName ?? "Demo Workspace",
      visitorName: null,
      websiteUrl: invite.companyWebsite ?? null,
      expiresAt: invite.expiresAt,
      mintedByAdminId: invite.invitedById ?? "system",
    });
    employerId = result.employerId;
    await prisma.employerInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedById: result.employerId },
    });
  }

  const employer = await prisma.user.findUnique({
    where: { id: employerId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!employer) {
    return <BadLink kind="invalid" />;
  }

  // Mint the NextAuth JWT scoped to invite expiry. This matches what
  // the credentials authorize() callback would produce on a real login.
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return <BadLink kind="invalid" />;
  }
  const sessionToken = await encode({
    token: {
      sub:   employer.id,
      id:    employer.id,
      email: employer.email,
      name:  employer.name,
      role:  employer.role,
      // ensure exp matches the invite, not a stale long-session default
      iat:   Math.floor(Date.now() / 1000),
      exp:   Math.floor(invite.expiresAt.getTime() / 1000),
    },
    secret,
  });

  const isProd = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  cookieStore.set({
    // NextAuth uses the __Secure-prefixed name on https
    name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: invite.expiresAt,
  });

  // Drop them straight into the populated employer dashboard.
  redirect("/employer");
}

function BadLink({ kind }: { kind: "invalid" | "expired" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-6">
      <div className="max-w-md w-full bg-card border border-line rounded-2xl p-8 text-center shadow-lg">
        <Link href="/" className="inline-flex justify-center mb-4">
          <LogoMark size={32} />
        </Link>
        <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          {kind === "expired" ? <Clock size={20} /> : <Sparkles size={20} />}
        </div>
        <h1 className="text-xl font-bold text-fg">
          {kind === "expired" ? "Demo link expired" : "Demo link not recognised"}
        </h1>
        <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
          {kind === "expired"
            ? "This demo workspace has reached its expiry. Reach out to your BHN contact for a fresh link — they can mint a new one in a couple of seconds."
            : "We couldn't find a demo for this URL. The link may have been retracted, or you may be on the wrong subdomain."}
        </p>
        <Link
          href="/for-employers"
          className="mt-5 inline-flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold text-sm px-5 py-2.5 rounded-lg"
        >
          Visit /for-employers <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
