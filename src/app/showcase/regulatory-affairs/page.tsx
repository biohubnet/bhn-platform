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
    // data-theme="light" pins this PUBLIC, brand-controlled page to the
    // light palette regardless of the visitor's chosen theme. The page
    // hardcodes a light gradient + white form cards, but the form's text
    // / border colours use theme tokens (--fg, --fg-subtle, --line). On
    // a dark theme like Voltage (hitech), --fg resolves to near-white
    // (#e3f7ff) → near-white text on white fields → unreadable. Pinning
    // the subtree to light resets those tokens to dark-on-light for the
    // whole page in one place, so the form stays high-contrast for every
    // visitor. (Themes are a logged-in personalisation; a public intake
    // form should be brand-consistent, not adopt the viewer's theme.)
    <main data-theme="light" className="min-h-screen bg-gradient-to-b from-[#f0f7f7] via-[#e6f0f1] to-[#dfecee]">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* BioHubNet brand lock-up — the brand PNG rendered from
            public/biohubnet-logo.svg (regenerate with
            scripts/render-logo-png.mjs). It already contains the hexagon
            hub-network mark + "BioHubNet" wordmark + "Transformative
            Talent Development" tagline, so we render it as a single image
            and don't re-typeset the wordmark below (that would duplicate). */}
        <header className="flex flex-col items-center text-center mb-10 sm:mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/biohubnet-logo.png"
            alt="BioHubNet — Transformative Talent Development"
            className="w-full max-w-md h-auto"
          />
        </header>

        {/* Showcase title */}
        <section className="mb-7 text-center">
          {/* #0b6f90, not the brand #0e7da3: at 10.5px bold on the light
              teal gradient the original was only ~4.0:1 (AA needs 4.5 at
              this size). This darker teal clears 4.5:1 across the whole
              gradient while reading the same. */}
          <p className="text-[10.5px] uppercase tracking-[0.22em] font-bold" style={{ color: "#0b6f90" }}>
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
