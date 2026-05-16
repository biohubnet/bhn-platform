"use client";
/**
 * Segment-level error boundary for /equip and its children.
 *
 * Why this exists: when a server component in this segment throws,
 * Next.js renders its generic "A server error occurred" page,
 * which gives the user no information about WHAT failed. This
 * boundary catches that throw and renders the actual error
 * message + digest on screen so we can diagnose in one round trip
 * without diving into Vercel function logs.
 *
 * Safe to leave shipped — Next.js only invokes it when an error
 * is actually thrown. Production sees a friendly retry CTA; the
 * raw error details are collapsed behind a disclosure.
 */
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function EquipError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the error to the browser console + Vercel function
  // logs so the message + stack land somewhere we can read.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[equip/error-boundary]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-rose-900">
              Equip ran into a server error
            </h1>
            <p className="text-sm text-rose-800 leading-relaxed mt-1">
              Something in this surface threw an unhandled error. Below
              is the actual message + digest — share it with an admin
              (or paste it back into the issue tracker) and we&apos;ll
              fix it.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-rose-300 bg-card-solid p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-rose-700">
            Error details
          </p>
          <p className="text-xs font-mono text-fg break-all">
            <strong>name:</strong> {error.name || "(none)"}
          </p>
          <p className="text-xs font-mono text-fg break-all">
            <strong>message:</strong> {error.message || "(empty)"}
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-fg break-all">
              <strong>digest:</strong> {error.digest}
            </p>
          )}
          {error.stack && (
            <details className="mt-2">
              <summary className="text-xs font-bold text-rose-700 cursor-pointer">
                Stack trace (click to expand)
              </summary>
              <pre className="mt-2 text-[10px] font-mono text-fg bg-elevated p-3 rounded overflow-x-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            <RefreshCcw size={13} /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 bg-card-solid hover:bg-elevated border border-line text-fg text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Home size={13} /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
