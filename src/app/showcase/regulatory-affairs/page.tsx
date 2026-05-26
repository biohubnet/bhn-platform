/**
 * /showcase/regulatory-affairs — PUBLIC page (no login required).
 *
 * BioHubNet Learning Pathway (Regulatory Affairs) Graduate Showcase
 * submission form. Anyone can land here, type their name + LinkedIn
 * handle, drop a headshot, and submit. Admin staff triage the
 * incoming submissions from /admin/showcase.
 *
 * Lives outside the (dashboard) group so it doesn't get the dashboard
 * shell + sidebar. Also no auth gate.
 */
import type { Metadata } from "next";
import { ShowcaseSubmitForm } from "@/components/showcase/ShowcaseSubmitForm";

export const metadata: Metadata = {
  title: "Graduate Showcase — Regulatory Affairs · BioHubNet",
  description:
    "Submit your name, LinkedIn handle, and a headshot to be featured in the BioHubNet Learning Pathway (Regulatory Affairs) graduate showcase.",
};

export default function ShowcaseRegulatoryAffairsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f0f7f7] via-[#e6f0f1] to-[#dfecee]">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* Logo + tagline ─ matches the BioHubNet brand the user
            uploaded. The svg already in /public renders the diamond
            mark; the wordmark + tagline are typeset below to match
            the look of the supplied PNG. */}
        <header className="flex flex-col items-center text-center mb-10 sm:mb-12">
          {/* Diamond mark from the existing brand asset */}
          <img
            src="/biohubnet-logo.svg"
            alt=""
            aria-hidden
            className="h-16 sm:h-20 mb-3"
          />
          <h1
            className="text-[28px] sm:text-[36px] font-bold leading-tight tracking-tight"
            style={{ color: "#2a6d7a" }}
          >
            <span>Bio</span>
            <span style={{ color: "#0e7da3" }}>Hub</span>
            <span style={{ color: "#67b094" }}>Net</span>
          </h1>
          <p className="mt-1 text-[14px] font-semibold tracking-wide" style={{ color: "#2a6d7a" }}>
            Transformative Talent Development
          </p>
        </header>

        {/* Showcase title */}
        <section className="mb-7 text-center">
          <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold" style={{ color: "#0e7da3" }}>
            Learning Pathway · Regulatory Affairs
          </p>
          <h2 className="mt-2 text-[24px] sm:text-[30px] font-bold text-fg leading-tight">
            Graduate Showcase
          </h2>
          <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-fg-muted max-w-md mx-auto">
            Done the pathway? Drop your name, LinkedIn handle, and a headshot, and we&apos;ll feature you alongside the other graduates. No login needed.
          </p>
        </section>

        {/* The form */}
        <section className="rounded-2xl bg-white shadow-card-rest border border-line/70 px-5 sm:px-7 py-5 sm:py-7">
          <ShowcaseSubmitForm programSlug="regulatory-affairs" />
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-[12px] text-fg-muted">
          <p>
            Already submitted? You can resubmit any time — we&apos;ll triage duplicates on our side.
          </p>
          <p className="mt-2">
            Questions? Reach out to the BioHubNet team.
          </p>
        </footer>
      </div>
    </main>
  );
}
