/**
 * /invite/[token] — public invite accept page.
 *
 * Works before the user is signed in. Shows the company name,
 * inviter, role, and the inviter's personal note. Two paths:
 *
 *   1. User is already signed in → shows an "Accept & join" button
 *      that POSTs to the accept API then redirects to /employer.
 *
 *   2. User is not signed in → shows "Accept & sign in" which
 *      routes through /login?callbackUrl=/invite/[token] so after
 *      auth they land back here and path 1 applies.
 *
 * Invalid / expired tokens render a clean error state.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, UserCheck, Clock, AlertCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcceptInviteButton } from "@/components/employer/AcceptInviteButton";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  owner:       "Owner",
  manager:     "Manager",
  generalist:  "Generalist / Recruiter",
  viewer:      "Viewer (read-only)",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;
  const session = await getSession();

  // Load invite data server-side (same query as the public API endpoint).
  const invite = await prisma.companyInvite.findUnique({
    where:  { token },
    select: {
      id:        true,
      status:    true,
      expiresAt: true,
      role:      true,
      note:      true,
      email:     true,
      company:   { select: { id: true, name: true, logo: true, logoShape: true } },
      invitedBy: { select: { name: true } },
    },
  }).catch(() => null);

  // ── Error states ───────────────────────────────────────────────
  const isInvalid  = !invite;
  const isUsed     = invite && invite.status !== "pending";
  const isExpired  = invite && invite.expiresAt < new Date();
  const hasError   = isInvalid || isUsed || isExpired;

  if (hasError) {
    const message = isInvalid
      ? "This invite link doesn't exist."
      : isUsed
      ? "This invite has already been accepted or revoked."
      : "This invite link has expired.";

    return (
      <main className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-red-500 ring-1 ring-inset ring-red-100 mb-2">
            <AlertCircle size={24} />
          </div>
          <h1 className="text-xl font-semibold text-fg">Invite unavailable</h1>
          <p className="text-sm text-muted">{message}</p>
          <Link
            href="/login"
            className="inline-block mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Go to login →
          </Link>
        </div>
      </main>
    );
  }

  // ── Already a member? Redirect straight to /employer ──────────
  if (session) {
    const alreadyMember = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: {
          companyId: invite.company.id,
          userId:    (session.user as { id: string }).id,
        },
      },
      select: { id: true },
    }).catch(() => null);

    if (alreadyMember) {
      redirect("/employer");
    }
  }

  const callerName  = invite.invitedBy.name ?? "A teammate";
  const roleLabel   = ROLE_LABELS[invite.role] ?? invite.role;
  const daysLeft    = Math.ceil((invite.expiresAt.getTime() - Date.now()) / 86_400_000);

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-subtle mb-1">
              Team invitation
            </p>
            <h1 className="text-2xl font-bold text-fg">
              {invite.company.name}
            </h1>
          </div>
        </div>

        {/* Invite details card */}
        <div className="bg-card border border-line rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <UserCheck size={18} className="text-brand-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-fg">
                {callerName} invited you to join as a{" "}
                <span className="font-semibold text-brand-700">{roleLabel}</span>
              </p>
              <p className="text-xs text-muted mt-0.5">
                Joining {invite.company.name}'s employer workspace on BHN Training
              </p>
            </div>
          </div>

          {invite.note && (
            <blockquote className="border-l-2 border-brand-300 pl-4 py-1 text-sm text-muted italic">
              "{invite.note}"
            </blockquote>
          )}

          <div className="flex items-center gap-2 text-xs text-subtle">
            <Clock size={12} />
            <span>
              {daysLeft <= 1 ? "Expires today" : `Expires in ${daysLeft} days`}
            </span>
          </div>
        </div>

        {/* CTA */}
        {session ? (
          <AcceptInviteButton token={token} />
        ) : (
          <div className="space-y-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
              className="block w-full text-center py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
            >
              Accept &amp; sign in
            </Link>
            <p className="text-center text-xs text-muted">
              Don&apos;t have an account?{" "}
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Create one
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
