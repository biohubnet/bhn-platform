import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

/**
 * Public layout for the Events module surfaces (/events/[slug] etc.).
 *
 * Distinct from the (dashboard) layout: no sidebar, no auth gate, no
 * heavy chrome. Designed to feel like a clean marketing page that a
 * non-logged-in visitor can land on (after clicking through from
 * biohubnet.ca / LinkedIn / email) and decide whether to register.
 *
 * Header has the BHN logo (links home) and a small Sign-in affordance
 * for return visitors. Footer keeps the privacy/terms links visible
 * since this page collects no personal data itself — the registration
 * flow is where consent matters, and that flow is gated by auth.
 */
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="border-b border-line bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-bold text-fg text-sm">
              BHN <span className="text-brand-600 font-semibold">Events</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-muted hover:text-fg transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-2 items-center justify-between text-xs text-subtle">
          <p>© BioHubNet · The Biomanufacturing Hub Network</p>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-fg transition-colors">Terms</Link>
            <Link href="/" className="hover:text-fg transition-colors">BHN Training</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
