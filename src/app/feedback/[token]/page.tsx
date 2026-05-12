import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { headers } from "next/headers";
import { LogoMark } from "@/components/ui/Logo";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

/**
 * Public-facing feedback form rendered against a single-use
 * invitation token. Sits OUTSIDE the (dashboard) group so an
 * anonymous viewer can land here from an email link.
 *
 * The actual form handles its own submit + state — server just
 * fetches invitation metadata to render the header.
 */
export default async function FeedbackTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Server-side fetch of invitation metadata via the same endpoint
  // the client would use. We could read the DB directly, but going
  // through the API keeps the validity + consumed + expired logic
  // in one place.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host  = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const url   = `${proto}://${host}/api/feedback/${token}`;
  const res   = await fetch(url, { cache: "no-store" });
  const meta  = await res.json().catch(() => ({})) as {
    ok?: boolean;
    error?: string;
    code?: string;
    invitation?: {
      id: string;
      kind: string;
      message: string | null;
      expiresAt: string;
      targetUserName: string | null;
      requiresLogin: boolean;
      invitedByName: string | null;
    };
  };

  if (!res.ok || !meta.ok || !meta.invitation) {
    return (
      <div className="min-h-screen bg-page flex flex-col">
        <PublicHeader />
        <main className="flex-1 max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-fg">Invitation unavailable</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            {meta.code === "consumed"
              ? "This feedback link has already been used — thank you!"
              : meta.code === "expired"
                ? "This feedback link has expired. If you'd still like to share, contact support@biohubnet.ca."
                : meta.error ?? "We couldn't find this feedback invitation."}
          </p>
          <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-brand-700 hover:underline">
            Back to BioHubNet
          </Link>
        </main>
      </div>
    );
  }

  const inv = meta.invitation;

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6 w-full">
        <header>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-600">
            BioHubNet · Feedback
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-2 tracking-tight inline-flex items-center gap-2">
            <MessageSquare size={22} className="text-brand-600" />
            We'd love to hear from you
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed max-w-xl">
            {inv.kind === "exit_survey"
              ? "A short survey about your time in the BioHubNet talent pool. Your answers help us improve the platform for the next cohort. Takes about 2 minutes."
              : inv.kind === "post_completion"
                ? "Now that you've finished, we'd love to hear how it went. Honest answers help us shape what comes next."
                : inv.kind === "nps_check"
                  ? "One quick rating + a couple of optional notes. Less than a minute."
                  : "We'd love your feedback. Anything you share goes directly to the BHN team."}
          </p>
          {inv.message && (
            <p className="text-sm text-fg bg-card border border-line rounded-xl px-4 py-3 mt-4 leading-snug italic">
              "{inv.message}"
              {inv.invitedByName && (
                <span className="block text-xs text-subtle not-italic mt-1">— {inv.invitedByName}</span>
              )}
            </p>
          )}
        </header>

        <FeedbackForm token={token} kind={inv.kind} />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="border-b border-line bg-card">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-bold text-fg text-sm">
            BHN <span className="text-brand-600 font-semibold">Feedback</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-line mt-12 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-xs text-subtle text-center">
        © BioHubNet · The Biomanufacturing Hub Network
      </div>
    </footer>
  );
}
