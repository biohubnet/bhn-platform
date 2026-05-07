import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of service · BHN Training",
  description: "The agreement between you and BHN Training.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-8">
          <ArrowLeft size={12} /> Back home
        </Link>

        <h1 className="text-3xl font-bold text-fg tracking-tight">Terms of service</h1>
        <p className="text-sm text-subtle mt-1">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
          <h2>Account</h2>
          <p>
            You&apos;re responsible for the security of your account credentials. Don&apos;t share them.
            Use the platform for legitimate professional training purposes.
          </p>

          <h2>Acceptable use</h2>
          <p>
            Don&apos;t upload illegal content, malware, or material you don&apos;t have rights to. Don&apos;t
            attempt to bypass access controls, scrape at scale, or impersonate other users.
          </p>

          <h2>BHN Credits</h2>
          <p>
            Credits are an internal currency for enrolling in courses. They have no cash value and
            cannot be transferred or refunded outside the platform&apos;s normal flows.
          </p>

          <h2>Certifications</h2>
          <p>
            Certificates issued by the platform reflect completion of specific training as offered
            by BHN. They are not professional licenses and do not substitute for any required
            regulatory or industry credentials.
          </p>

          <h2>Liability</h2>
          <p>
            The platform is provided &quot;as is&quot;. BHN&apos;s total liability is limited to the
            amount you paid for the service in the 12 months preceding any claim.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms. Material changes will be posted on the change log and
            communicated to admins.
          </p>
        </div>
      </div>
    </div>
  );
}
