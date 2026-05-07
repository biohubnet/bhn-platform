import Link from "next/link";
import { Building2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeCycler } from "@/components/ui/ThemePicker";
import { prisma } from "@/lib/prisma";
import { ClaimEmployerForm } from "@/components/auth/ClaimEmployerForm";

/**
 * Public — anyone with the invite link lands here. We pre-resolve the
 * invite server-side so we can render the right shell (claim form vs.
 * already-used vs. expired) without flashing.
 */
export default async function ClaimEmployerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.employerInvite.findUnique({
    where: { token },
    select: {
      email: true, companyName: true, companyWebsite: true,
      usedAt: true, expiresAt: true,
    },
  });

  const used = !!invite?.usedAt;
  const expired = invite ? invite.expiresAt < new Date() : false;
  const ok = invite && !used && !expired;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-card to-brand-100 px-4 py-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeCycler />
      </div>
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Logo size="lg" />
        </Link>

        <div className="bg-card rounded-2xl shadow-xl shadow-brand-900/5 border border-line p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-fg leading-tight">Set up your Employer HR account</h1>
              <p className="text-xs text-muted mt-0.5">BioHubNet partner portal</p>
            </div>
          </div>

          {!invite ? (
            <Notice
              tone="rose"
              title="Invite not found"
              body="This link doesn't match any active invite. If you received it from a BHN admin, ask them to issue a fresh one."
            />
          ) : used ? (
            <Notice
              tone="amber"
              title="Already claimed"
              body="This invite has already been used to create an account. Sign in instead."
            >
              <Link
                href="/login"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
              >
                Go to sign-in →
              </Link>
            </Notice>
          ) : expired ? (
            <Notice
              tone="amber"
              title="Invite expired"
              body="This invite is past its expiry date. Please ask the BHN team for a new one."
            />
          ) : (
            <>
              <p className="text-sm text-muted mb-4">
                You&apos;ve been invited to join BHN as <strong className="text-fg">{invite.companyName ?? "an industry partner"}</strong>.
                Set a name and a password — your email is locked to{" "}
                <strong className="text-fg">{invite.email}</strong>.
              </p>
              <ClaimEmployerForm
                token={token}
                email={invite.email}
                companyName={invite.companyName}
              />
            </>
          )}

          {ok && (
            <p className="text-[11px] text-subtle mt-5 text-center">
              By claiming you accept the BHN partner terms.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Notice({
  tone, title, body, children,
}: {
  tone: "rose" | "amber";
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const cls =
    tone === "rose"
      ? "bg-rose-50 border-rose-200 text-rose-700"
      : "bg-amber-50 border-amber-200 text-amber-700";
  return (
    <div className={`border rounded-xl p-4 ${cls}`}>
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm mt-1 leading-relaxed">{body}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
