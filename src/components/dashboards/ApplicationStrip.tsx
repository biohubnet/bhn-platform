/**
 * The two programme applications a trainee can make, side by side under
 * the dashboard's What's on band: ENGAGE training credits (brand colour)
 * and the EXPERIENCE Industry Internship programme (amber, its pillar
 * colour in the sidebar).
 *
 * Both cards keep their pillar frame in every state; the status is a
 * badge, so the pair always reads as a pair. Once both applications are
 * approved the strip renders nothing.
 *
 * Server component. Replaces the single CreditApplicationCallout.
 */
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Coins, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type AppState = "none" | "pending" | "rejected" | "approved";

export interface AppStatus {
  state: AppState;
  /** When the latest application was submitted / reviewed. */
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  reviewerNote?: string | null;
  /** EXPERIENCE only: approved AND cleared for employers to see. */
  visibleToEmployers?: boolean;
}

/** CreditApplication.status → card state. */
export function creditAppStatus(
  app: { status: string; submittedAt: Date; reviewedAt: Date | null; reviewerNote: string | null } | null,
): AppStatus {
  if (!app) return { state: "none" };
  const state: AppState = app.status === "approved" ? "approved" : app.status === "pending" ? "pending" : "rejected";
  return { state, submittedAt: app.submittedAt, reviewedAt: app.reviewedAt, reviewerNote: app.reviewerNote };
}

/** Latest talent-application EventFormSubmission → card state. Leaving
 *  the pool counts as not applied, so the card offers to apply again. */
export function internshipAppStatus(
  sub: {
    reviewStatus: string; createdAt: Date; reviewedAt: Date | null; reviewerNote: string | null;
    eligibilityApprovedAt: Date | null; leftPoolAt: Date | null;
  } | null,
): AppStatus {
  if (!sub || sub.leftPoolAt) return { state: "none" };
  const approved = sub.reviewStatus === "approved" || sub.reviewStatus === "approved_skip_review";
  const state: AppState = approved ? "approved" : sub.reviewStatus === "rejected" ? "rejected" : "pending";
  return {
    state, submittedAt: sub.createdAt, reviewedAt: sub.reviewedAt, reviewerNote: sub.reviewerNote,
    visibleToEmployers: approved && !!sub.eligibilityApprovedAt,
  };
}

const TONES = {
  engage: {
    frame: "border-brand-300 from-brand-50 via-brand-100/50 to-brand-50",
    icon: "bg-brand-600",
    accent: "text-brand-700",
    button: "bg-brand-600 hover:bg-brand-700 shadow-brand-600/25",
    linkHover: "hover:text-brand-700",
  },
  experience: {
    frame: "border-amber-200 from-amber-50 via-amber-100/50 to-amber-50",
    icon: "bg-amber-700",
    accent: "text-amber-800",
    button: "bg-amber-700 hover:bg-amber-800 shadow-amber-700/25",
    // Not amber-800: dark themes don't lift its hover state.
    linkHover: "hover:text-fg",
  },
} as const;
type Tone = keyof typeof TONES;

const BADGES: Record<AppState, { label: string; tone: "neutral" | "warning" | "danger" | "success" }> = {
  none: { label: "Not applied", tone: "neutral" },
  pending: { label: "Under review", tone: "warning" },
  rejected: { label: "Not approved", tone: "danger" },
  approved: { label: "Approved", tone: "success" },
};

const day = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Toronto" }).format(d) : null;

export function ApplicationStrip({
  credit,
  internship,
  ttlDays,
}: {
  credit: AppStatus;
  internship: AppStatus;
  ttlDays: number;
}) {
  if (credit.state === "approved" && internship.state === "approved") return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch" data-application-strip>
      <PillarCard
        tone="engage"
        icon={Coins}
        eyebrow="ENGAGE · Training credits"
        status={credit}
        heading={{
          none: <>Apply for up to <Accent tone="engage">5,000 free training credits</Accent></>,
          pending: "Your training-credit application is under review",
          rejected: "Your training-credit application wasn't approved",
          approved: "You're approved for training credits",
        }}
        intro="Eligible Highly Qualified Personnel (HQP) at one of the 14 partner Ontario institutions can receive up to 5,000 ENGAGE credits at no cost."
        approvedText="Spend them on any ENGAGE course or pathway."
        qualifies={[
          "Grad students (MSc / PhD, 2+ semesters)",
          "Postdoctoral fellows",
          "Research associates",
          "Lab technicians in STEM programs",
        ]}
        finePrint={
          <>
            Credits expire <strong className="text-muted">{ttlDays} days</strong> from approval, and the
            remainder expires if fewer than 2,500 are used in the first 6 months. Full eligibility at{" "}
            <a href="https://biohubnet.ca/engage/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">
              biohubnet.ca/engage
            </a>.
          </>
        }
        applyHref="/credits/apply"
        statusHref="/credits"
        secondary={{ label: "View my balance", href: "/credits" }}
      />
      <PillarCard
        tone="experience"
        icon={Briefcase}
        eyebrow="EXPERIENCE · Industry Internship"
        status={internship}
        heading={{
          none: <>Apply for the <Accent tone="experience">Industry Internship program</Accent></>,
          pending: "Your internship application is under review",
          rejected: "Your internship application wasn't approved",
          approved: "You're in the Industry Internship talent pool",
        }}
        intro="Join BioHubNet's talent pool. Once you're approved, life-sciences host companies can find your profile and invite you to interview for internships."
        approvedText={
          internship.visibleToEmployers
            ? "Host companies can now find your profile and invite you to interview."
            : "An admin is finishing a last check before host companies can see your profile."
        }
        qualifies={[
          "Master's and PhD students",
          "Postdoctoral fellows",
          "Research associates and lab technicians",
          "New or soon-to-be graduates",
        ]}
        finePrint="Have your program details and your research supervisor's contact ready. A signed graduate-office verification and a supervisor support letter strengthen your application."
        applyHref="/forms/talent-application"
        statusHref="/forms/talent-application"
        secondary={{ label: "Browse opportunities", href: "/internships" }}
      />
    </div>
  );
}

function Accent({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={TONES[tone].accent}>{children}</span>;
}

function PillarCard({
  tone, icon: Icon, eyebrow, status, heading, intro, approvedText, qualifies, finePrint,
  applyHref, statusHref, secondary,
}: {
  tone: Tone;
  icon: ElementType;
  eyebrow: string;
  status: AppStatus;
  heading: Record<AppState, ReactNode>;
  intro: string;
  approvedText: string;
  qualifies: string[];
  finePrint: ReactNode;
  applyHref: string;
  statusHref: string;
  secondary: { label: string; href: string };
}) {
  const t = TONES[tone];
  const badge = BADGES[status.state];
  const button = cn(
    "inline-flex items-center justify-center gap-2 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-all hover:-translate-y-0.5",
    t.button,
  );
  const quiet = cn("inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors", t.linkHover);

  return (
    <section
      aria-label={eyebrow}
      className={cn("h-full rounded-2xl border-2 bg-gradient-to-br shadow-elevated p-5 sm:p-6", t.frame)}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-white flex items-center justify-center shrink-0", t.icon)}>
          <Icon size={22} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={cn("uppercase tracking-[0.22em] text-[10.5px] font-bold", t.accent)}>{eyebrow}</p>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <p className="mt-1 text-lg sm:text-xl font-bold text-fg leading-tight tracking-tight">{heading[status.state]}</p>

          {status.state === "none" && (
            <>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{intro}</p>
              <div className="mt-3 rounded-xl bg-card/85 backdrop-blur border border-line px-3 py-2.5 text-xs">
                <p className="font-bold text-fg mb-1 text-[11px] uppercase tracking-[0.18em]">Who qualifies</p>
                <ul className="list-disc list-inside leading-snug space-y-0.5 text-muted">
                  {qualifies.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </div>
              <p className="mt-2.5 text-[11.5px] text-subtle leading-relaxed">{finePrint}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href={applyHref} className={button}>
                  <FileText size={15} aria-hidden /> Start application <ArrowRight size={15} aria-hidden />
                </Link>
                <Link href={secondary.href} className={quiet}>
                  {secondary.label} <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            </>
          )}

          {status.state === "pending" && (
            <>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                Submitted {day(status.submittedAt) ?? "recently"}. An admin reviews each application personally,
                typically within a few business days. We&apos;ll let you know when it&apos;s decided.
              </p>
              <Link href={statusHref} className={cn(quiet, "mt-3")}>
                View application status <ArrowRight size={14} aria-hidden />
              </Link>
            </>
          )}

          {status.state === "rejected" && (
            <>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                {status.reviewedAt ? `Reviewed ${day(status.reviewedAt)}. ` : ""}You can submit a new application anytime.
              </p>
              {status.reviewerNote && (
                <p className="mt-2 rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg leading-relaxed">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-0.5">Reviewer note</span>
                  {status.reviewerNote}
                </p>
              )}
              <Link href={applyHref} className={cn(button, "mt-3")}>
                <FileText size={15} aria-hidden /> Submit a new application <ArrowRight size={15} aria-hidden />
              </Link>
            </>
          )}

          {status.state === "approved" && (
            <>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{approvedText}</p>
              <Link href={secondary.href} className={cn(quiet, "mt-3")}>
                {secondary.label} <ArrowRight size={14} aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
