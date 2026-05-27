/**
 * CreditApplicationCallout — prominent dashboard banner that
 * surfaces the ENGAGE credit-application flow. Three render states:
 *
 *   • NO application yet         → big brand CTA: "Apply for up to
 *                                   5,000 ENGAGE training credits"
 *                                   with eligibility highlights and a
 *                                   Start application button.
 *   • PENDING under review       → amber status chip explaining
 *                                   what's happening.
 *   • REJECTED                   → rose status with re-apply button.
 *
 * Returns null when the application has been APPROVED — at that
 * point the credits are already in the user's balance and the
 * dashboard doesn't need to repeat the message.
 *
 * Used on both the dashboard home (top, right under the hero) and
 * the /credits page (where it lives in the existing
 * ApplicationStatusCard slot). The two surfaces render an identical
 * pitch so the action is the same wherever the trainee sees it.
 */

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, FileText, XCircle, Coins } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface CreditApplicationCalloutData {
  status: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewerNote: string | null;
  approvedAmount: number | null;
}

interface Props {
  /** Latest application for this user, newest first; null if they
   *  have never applied. Approved applications hide the callout. */
  latestApp: CreditApplicationCalloutData | null;
  /** Days until grant expiry — surfaces in the "what to know" list
   *  on the CTA card. Optional; falls back to the default 365. */
  ttlDays?: number;
  /** Visual density. "prominent" is the dashboard-hero presentation;
   *  "compact" is the smaller variant used inside /credits where
   *  the page already explains the program. */
  variant?: "prominent" | "compact";
}

export function CreditApplicationCallout({
  latestApp,
  ttlDays = 365,
  variant = "prominent",
}: Props) {
  // Hide entirely once approved — the credits are in the user's
  // balance and the dashboard doesn't need to repeat the pitch.
  if (latestApp?.status === "approved") return null;

  if (!latestApp) {
    return <FreshCta ttlDays={ttlDays} variant={variant} />;
  }

  if (latestApp.status === "pending") {
    return <PendingState submittedAt={latestApp.submittedAt} variant={variant} />;
  }

  // status === "rejected"
  return <RejectedState latestApp={latestApp} variant={variant} />;
}

/** First-time CTA — the loud one. Trainees on this state have
 *  never applied; the dashboard surface needs to make them aware
 *  the credit grant exists. */
function FreshCta({ ttlDays, variant }: { ttlDays: number; variant: "prominent" | "compact" }) {
  return (
    <div
      className={
        "relative overflow-hidden " +
        (variant === "prominent"
          ? "rounded-2xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 via-brand-100/50 to-amber-50 shadow-elevated p-6 sm:p-8"
          : "rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/40 p-6")
      }
    >
      {/* Decorative coin glyph wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(closest-side, #f59e0b, transparent 70%)" }}
      />

      <div className="relative flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
        <div
          className={cn(
            "rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0",
            variant === "prominent" ? "w-12 h-12 sm:w-14 sm:h-14" : "w-10 h-10",
          )}
        >
          <Coins size={variant === "prominent" ? 26 : 20} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "uppercase tracking-[0.22em] text-[10.5px] font-bold text-brand-700",
            )}
          >
            ENGAGE · Training credits
          </p>
          <h2
            className={cn(
              "font-bold text-fg leading-tight tracking-tight mt-1",
              variant === "prominent"
                ? "text-xl sm:text-2xl"
                : "text-base sm:text-lg",
            )}
          >
            Apply for up to{" "}
            <span className="text-brand-700">5,000 free training credits</span>
          </h2>
          <p className="text-sm text-fg-muted leading-relaxed mt-2 max-w-prose">
            Eligible Highly Qualified Personnel (HQP) at one of the 14 partner Ontario
            institutions can receive up to <strong className="text-fg">5,000 ENGAGE credits</strong>{" "}
            at no cost. An admin reviews each application personally — typically within a few
            business days.
          </p>

          {variant === "prominent" && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-card/85 backdrop-blur border border-line p-3">
                <p className="font-bold text-fg mb-1 text-[11px] uppercase tracking-[0.18em]">
                  Who qualifies
                </p>
                <ul className="list-disc list-inside leading-relaxed space-y-0.5 text-fg-muted">
                  <li>Grad students (MSc / PhD, 2+ semesters)</li>
                  <li>Postdoctoral fellows</li>
                  <li>Research associates</li>
                  <li>Lab technicians in STEM programs</li>
                </ul>
              </div>
              <div className="rounded-xl bg-card/85 backdrop-blur border border-line p-3">
                <p className="font-bold text-fg mb-1 text-[11px] uppercase tracking-[0.18em]">
                  What you&apos;ll upload
                </p>
                <ul className="list-disc list-inside leading-relaxed space-y-0.5 text-fg-muted">
                  <li>
                    <span className="text-fg">Grad students:</span> unofficial transcript +
                    grad-office signed verification
                  </li>
                  <li>
                    <span className="text-fg">Other roles:</span> letter confirming employment /
                    appointment
                  </li>
                </ul>
              </div>
            </div>
          )}

          <p className="mt-3 text-[11.5px] text-fg-subtle leading-relaxed">
            Credits expire <strong className="text-fg-muted">{ttlDays} days</strong> from approval.
            BHN policy also expires the remainder if fewer than 2,500 are used in the first 6
            months — plan your enrolments accordingly. Full eligibility at{" "}
            <a
              href="https://biohubnet.ca/engage/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 font-semibold hover:underline"
            >
              biohubnet.ca/engage
            </a>
            .
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/credits/apply"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md shadow-brand-600/25 transition-all hover:-translate-y-0.5"
            >
              <FileText size={15} />
              Start application
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/credits"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-brand-700 transition-colors"
            >
              View my balance →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingState({ submittedAt, variant }: { submittedAt: Date; variant: "prominent" | "compact" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-amber-200 bg-amber-50",
        variant === "prominent" ? "p-5 sm:p-6" : "p-5",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Clock size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-amber-900">
              Your ENGAGE credit application is under review
            </p>
            <Badge tone="amber">Pending</Badge>
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">
            Submitted {new Date(submittedAt).toLocaleDateString()}. An admin reviews each
            application personally — typically within a few business days. We&apos;ll notify you
            the moment it&apos;s approved or if anything needs clarification.
          </p>
          <Link
            href="/credits"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 hover:text-amber-950"
          >
            View application status <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function RejectedState({
  latestApp,
  variant,
}: {
  latestApp: CreditApplicationCalloutData;
  variant: "prominent" | "compact";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-rose-200 bg-rose-50",
        variant === "prominent" ? "p-5 sm:p-6" : "p-5",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
          <XCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-rose-900">
              Your previous credit application wasn&apos;t approved
            </p>
            <Badge tone="danger">Rejected</Badge>
          </div>
          <p className="text-sm text-rose-800">
            Reviewed on{" "}
            {latestApp.reviewedAt
              ? new Date(latestApp.reviewedAt).toLocaleDateString()
              : "—"}
            . You can submit a new application anytime.
          </p>
          {latestApp.reviewerNote && (
            <p className="text-sm text-rose-800 bg-card border border-rose-100 rounded-lg p-3 mt-2 leading-relaxed">
              <span className="block text-xs font-semibold text-rose-700 mb-1 uppercase tracking-wider">
                Reviewer note
              </span>
              {latestApp.reviewerNote}
            </p>
          )}
          <Link
            href="/credits/apply"
            className="mt-3 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            <FileText size={14} />
            Submit a new application
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Local cn — same idea as @/lib/utils/cn, inlined here to avoid
 *  pulling another dep into a tightly-scoped surface. */
function cn(...args: Array<string | false | undefined>) {
  return args.filter(Boolean).join(" ");
}

/** Tiny re-export so the credits page can use the same callout
 *  without re-implementing the variant logic. */
export const CreditApplicationCalloutCompact = (
  props: Omit<Props, "variant">,
) => <CreditApplicationCallout {...props} variant="compact" />;

/** A non-shown placeholder, used so the dashboard can ask "should I
 *  render this row?" with a single helper instead of duplicating the
 *  "hide once approved" rule across files. */
export function shouldShowCreditApplicationCallout(
  app: CreditApplicationCalloutData | null,
): boolean {
  return !app || app.status !== "approved";
}
