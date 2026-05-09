/**
 * /verify-email/[token] — friendly landing for the verification link
 * we email on registration. The link in the email comes here (not to
 * the JSON API endpoint) so a user clicking from their inbox lands on
 * a styled page with a clear "what just happened" status.
 *
 * Server component: claims the token on render, then shows the
 * outcome. No client-side JS needed.
 */
import Link from "next/link";
import { Check, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { claimEmailVerification } from "@/lib/security/email-verify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify your email · BHN Training" };

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await claimEmailVerification(token);

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-line rounded-2xl shadow-lg p-8 text-center">
        {result.ok ? (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Check size={22} />
            </div>
            <h1 className="text-xl font-semibold text-fg mt-4">Email verified</h1>
            <p className="text-sm text-muted mt-2">
              <strong className="text-fg">{result.email}</strong> is now confirmed. You can sign in any time.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
            >
              Continue to sign in <ArrowRight size={14} />
            </Link>
          </>
        ) : result.reason === "expired" ? (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Clock size={22} />
            </div>
            <h1 className="text-xl font-semibold text-fg mt-4">Link expired</h1>
            <p className="text-sm text-muted mt-2">
              Verification links are valid for 7 days. Sign in and we&apos;ll send you a fresh one — or
              use the resend tool below.
            </p>
            <Link
              href="/login?resendVerify=1"
              className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
            >
              Resend verification email <ArrowRight size={14} />
            </Link>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AlertCircle size={22} />
            </div>
            <h1 className="text-xl font-semibold text-fg mt-4">Link not recognised</h1>
            <p className="text-sm text-muted mt-2">
              This verification link has already been used or doesn&apos;t exist. If your email is
              still unverified, request a fresh link.
            </p>
            <Link
              href="/login?resendVerify=1"
              className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium"
            >
              Resend verification email <ArrowRight size={14} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
