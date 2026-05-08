import Link from "next/link";
import { Clock, AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export default async function EmployerInviteErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  const meta = reason === "expired" ? {
    Icon: Clock,
    title: "Invite expired",
    body: "This employer invite has reached its expiry date. Reach out to your BHN contact for a fresh link — they can mint a new one in a couple of seconds.",
  } : reason === "conflict" ? {
    Icon: ShieldAlert,
    title: "Email already in use",
    body: "An account with this email already exists on BHN under a different role. We won't auto-elevate it via an invite link. Sign in with your existing credentials, or ask your BHN contact to invite a different email.",
  } : {
    Icon: AlertTriangle,
    title: "Invite not recognised",
    body: "We couldn't find an active invite for this URL. The link may have been retracted or you may be on the wrong subdomain.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-6">
      <div className="max-w-md w-full bg-card border border-line rounded-2xl p-8 text-center shadow-lg">
        <Link href="/" className="inline-flex justify-center mb-4">
          <LogoMark size={32} />
        </Link>
        <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <meta.Icon size={20} />
        </div>
        <h1 className="text-xl font-bold text-fg">{meta.title}</h1>
        <p className="text-sm text-muted mt-2 max-w-sm mx-auto leading-relaxed">{meta.body}</p>
        <div className="mt-5 flex justify-center gap-2 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold text-sm px-5 py-2.5 rounded-lg"
          >
            Sign in <ArrowRight size={14} />
          </Link>
          <Link
            href="/for-employers"
            className="inline-flex items-center gap-2 bg-card-solid border border-line text-muted hover:text-fg font-medium text-sm px-5 py-2.5 rounded-lg"
          >
            Visit /for-employers
          </Link>
        </div>
      </div>
    </div>
  );
}
