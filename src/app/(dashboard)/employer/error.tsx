"use client";
/**
 * Route-segment error boundary for /employer (and every nested HR
 * page that doesn't ship its own).
 *
 * Catches unhandled exceptions in the server-component tree or any
 * client island, and renders a recoverable surface with a "try again"
 * button instead of Next.js's default white-screen overlay. The
 * digest hint and error message are surfaced to the operator so a
 * support ticket can link straight to the deployment logs.
 *
 * The brand stage at /employer fans out 7+ Prisma queries; each one
 * has a per-call `.catch`, but a defence-in-depth boundary here means
 * even an unexpected import error or a JSX render-time throw never
 * leaves the user staring at "page can't be loaded".
 */
import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

export default function EmployerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Bubble to the browser console so it shows up in Vercel logs
    // alongside the original error.
    // eslint-disable-next-line no-console
    console.error("Employer page error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-card-solid rounded-3xl border border-rose-200 p-8 shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-rose-700">
              Employer page
            </p>
            <h1 className="text-xl font-bold text-fg mt-1">
              Something went wrong loading this surface
            </h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              The page hit an unexpected error on the server. Tap <em>Try again</em> to
              re-fetch — usually the second attempt clears it. If this keeps happening,
              copy the digest below into a support note.
            </p>
            {error.digest && (
              <p className="mt-3 text-[11px] text-subtle font-mono break-all">
                digest: {error.digest}
              </p>
            )}
            {error.message && (
              <p className="mt-1 text-[11px] text-rose-700 font-mono break-all">
                {error.message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm shadow-brand-600/25 transition-colors"
              >
                <RefreshCw size={13} /> Try again
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg hover:bg-elevated px-3 py-2 rounded-xl transition-colors"
              >
                <Home size={13} /> Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
