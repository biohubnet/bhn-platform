import {
  Compass, Building2, FilePlus, Inbox, Users, Briefcase,
  Calendar, ArrowDown, ArrowRight, CheckCircle2, Send,
  ClipboardList, Activity, Sparkles,
} from "lucide-react";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { NavHighlight, NavHighlightZone } from "@/components/guide/NavHighlight";

/**
 * /employer/how-it-works — Hiring guide for HR / employer accounts.
 *
 * Mirrors the trainee-facing /experience guide but for the recruiter
 * journey end-to-end. Same conventions:
 *
 *   • DSPageHeader at top — renders Studio's gradient hero
 *     (drifting blobs + curve-down) via the /employer route
 *     scope, matching the /employer overview's chrome.
 *   • Flow chart of the 7 hiring stages, rendered as CSS boxes +
 *     arrows. Each box that maps to a sidebar item is wrapped in a
 *     <NavHighlightZone> so hovering it draws the dotted curve to
 *     the corresponding nav row.
 *   • Step-by-step prose with <NavHighlight> pills inline.
 *   • Practical tips strip at the bottom.
 *
 * Why a separate guide
 *   Trainees and recruiters live in different sections of the
 *   sidebar and act on different surfaces. A single combined guide
 *   would be confusing to either audience. This one is locked to
 *   employer + admin via the route's role gate.
 */
export default function EmployerHowItWorksPage() {
  return (
    <div>
      <DSPageHeader
        eyebrow="Hiring guide"
        icon={<Compass size={20} />}
        title="Hiring on BHN — how it works"
        description="Profile your company once, post a role with one paste, review AI-matched applicants with the full materials inline, run the pipeline through to an e-signed offer. Hover any highlighted name in this guide to find the matching control in your sidebar."
      />

      {/* ── Flow chart ────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-2 sm:px-0 -mt-2 mb-12">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-6">
          At a glance · the hiring journey
        </h2>
        <FlowChart />
      </section>

      {/* ── Step-by-step ──────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-2 sm:px-0 space-y-7 mb-12">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">
          Step-by-step
        </h2>

        <Step
          n={1}
          icon={Building2}
          title="Set up your company profile"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              Open{" "}
              <NavHighlight href="/employer/profile">Company profile</NavHighlight>{" "}
              and put together the public-facing bio: company name,
              website, logo, industry, size, location, founding year, a
              short description. Click <strong>AI auto-fill from
              website</strong> and we&apos;ll draft the description
              and metadata for you — review, tweak, save. Every posting
              you publish pulls from this profile, so the work isn&apos;t
              repeated per role.
            </p>
          )}
        />

        <Step
          n={2}
          icon={FilePlus}
          title="Publish your first posting"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              From{" "}
              <NavHighlight href="/employer/postings">My Postings</NavHighlight>{" "}
              click <strong>New posting</strong>. Paste a job description
              — even a rough one — and the AI fills in title, location,
              duration, compensation, type (full-time / co-op /
              internship), and key skills. Edit any field, set the
              deadline, hit publish. Status pills cycle{" "}
              <em>Active → Closed → Expired → Draft</em> on click — the
              standing tip above the table shows the cycle order.
            </p>
          )}
        />

        <Step
          n={3}
          icon={Inbox}
          title="Watch applications arrive — funnel view first"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              <NavHighlight href="/employer/applicants">Applicants</NavHighlight>{" "}
              is the platform-wide top-of-funnel — every trainee who
              submitted the talent application surfaces here with an
              AI match score against your active postings. Each card
              has a fit chip, materials icons (resume, video, cover
              letter, pitch), comments count, and an inline preview
              of resume + 1-min video. You don&apos;t need to drill
              into a per-posting page to do first-pass review.
            </p>
          )}
        />

        <Step
          n={4}
          icon={Users}
          title="Or hunt proactively in the talent pool"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              <NavHighlight href="/talent-pool">Talent pool</NavHighlight>{" "}
              is the same approved-applicant set but designed for
              outbound: you can browse, comment privately (admins +
              employers only — applicants never see), and reach out
              before they even apply to one of your postings.
              Useful for niche roles where the applicant volume is
              thin and you need to source rather than wait.
            </p>
          )}
        />

        <Step
          n={5}
          icon={Activity}
          title="Run the per-posting pipeline"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              Each posting has its own command surface at{" "}
              <strong>My Postings → pick a posting → Applicants</strong>.
              It opens a Kanban board across 6 active stages (New,
              Reviewing, Shortlisted, Phone screen, Onsite, Offer)
              with hired / passed / closed collapsed at the bottom.
              Switch to <strong>List view</strong> for high-volume
              postings (sortable table, denser scanning). Filter by
              score band, stale (≥7 days in current stage), has
              materials, has interview. Search by name or email.
              <strong> Bulk-select</strong> via the card checkboxes
              and move 10 candidates at once — no drag-drop ten times.
              The page also flags applications stuck in the same
              stage for ≥7 days as <em>stale</em> so triage stays
              honest.
            </p>
          )}
        />

        <Step
          n={6}
          icon={Calendar}
          title="Schedule interviews + score with a rubric"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              On any applicant&apos;s detail page (click <em>Review
              applicants → Open</em> on a card), propose 1-5 time
              slots, format (phone / video / on-site), location or
              link. The trainee picks one in their{" "}
              <NavHighlight href="/interviews">Interviews</NavHighlight>{" "}
              view — both sides see the confirmed slot, no parallel
              email thread. After the interview, fill out the
              structured rubric: overall 1-5, per-skill scores
              against the posting&apos;s required skills, hire / maybe
              / pass recommendation, strengths, concerns. Each
              interviewer creates their own row so multi-stakeholder
              feedback compounds.
            </p>
          )}
        />

        <Step
          n={7}
          icon={Send}
          title="Compose an offer and send it"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              From the applicant detail, open the offer composer.
              Three templates ship with the platform: <strong>paid
              internship</strong>, <strong>academic credit</strong>,
              and <strong>contract</strong>. Each has placeholders
              for compensation, hours, start / end dates, location,
              acceptance deadline. Markdown body, drafts autosave.
              When you click <strong>Send</strong>, the trainee gets
              a transactional email and the offer surfaces in their
              application tracker. They <strong>accept</strong> with
              a single click — that writes an{" "}
              <code className="font-mono text-[11px] bg-elevated px-1 rounded">ElectronicSignature</code>{" "}
              audit row (21 CFR Part 11 pattern). Accepting auto-
              withdraws every other open application they hold so
              you and other employers aren&apos;t chasing a candidate
              who&apos;s already hired.
            </p>
          )}
        />

        <Step
          n={8}
          icon={ClipboardList}
          title="Watch the funnel + improve over time"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              Every posting page leads with a funnel overview —
              total applied, new in the last 24 h, proportional
              segments (New / In progress / Hired / Closed),
              stale-application count. Admins additionally get a
              platform-wide <strong>Pipeline analytics</strong> view
              with median time-in-stage, stalled-application list,
              and conversion-to-offer rate so you can spot where the
              process is leaking and adjust.
            </p>
          )}
        />
      </section>

      {/* ── Practical tips ────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-2 sm:px-0 mb-16">
        <div className="rounded-2xl border border-line bg-card surface-shadow p-5">
          <h3 className="text-sm font-semibold text-fg mb-3 inline-flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Practical tips
          </h3>
          <ul className="space-y-2 text-sm text-muted leading-relaxed">
            <li>
              <strong className="text-fg">Tag your postings with skills.</strong>{" "}
              The AI match score depends on having skills wired to the
              posting. The AI tagger runs automatically on publish, but
              you can edit the skill list on the posting page if it
              missed a key competency. No skills tagged → no fit score
              against your applicants.
            </li>
            <li>
              <strong className="text-fg">Match scores are signal, not verdict.</strong>{" "}
              Open the drawer on any applicant to see the receipts:
              direct skill overlap, semantic similarity, completed
              pathway alignment, gaps, and honest caveats. A score of
              68 with high confidence often beats a score of 75 with
              low confidence — the explanation panel tells you which.
            </li>
            <li>
              <strong className="text-fg">Comments are team-private.</strong>{" "}
              Anything you write on an applicant&apos;s comment thread
              is visible to admins, fellow employers reviewing the
              same role, and instructors — never the applicant. Use
              it as the shared notebook for your hiring panel.
            </li>
            <li>
              <strong className="text-fg">Bulk actions save the most time on triage.</strong>{" "}
              On the Kanban / List view, check a handful of cards and
              the action bar floats up: move-to-reviewing,
              move-to-shortlisted, reject. Way faster than per-card
              dropdowns when you&apos;re sweeping the first-pass
              decisions.
            </li>
            <li>
              <strong className="text-fg">Watch the stale flag.</strong>{" "}
              Anything in a non-terminal stage for ≥7 days gets a rose
              chip and shows up under the <em>Stale only</em> filter.
              That&apos;s the trust contract with applicants — they
              get a yes/no in a reasonable window, you don&apos;t
              ghost.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

// ─── Step block ──────────────────────────────────────────────────

function Step({
  n, icon: Icon, title, body,
}: {
  n: number;
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
}) {
  // Stagger the idle bob so the row reads as a soft wave on first
  // paint (1 bobs first, 2 a quarter cycle later, etc.). Same
  // motion language as the trainee /experience guide.
  const delaySec = ((n - 1) * 0.45).toFixed(2);
  return (
    <div className="group/step flex items-start gap-4">
      <div
        className="shrink-0 w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-600/30 animate-step-bob transition-transform group-hover/step:scale-110 group-hover/step:rotate-[-4deg]"
        style={{ animationDelay: `${delaySec}s` }}
      >
        <span className="text-base font-bold leading-none">{n}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-fg inline-flex items-center gap-2 tracking-tight">
          <Icon size={14} className="text-brand-700" />
          {title}
        </h3>
        <div className="mt-1.5">{body}</div>
      </div>
    </div>
  );
}

// ─── Flow chart ──────────────────────────────────────────────────

/**
 * Vertical flow chart with two parallel inbound tracks (talent-pool
 * sourcing vs. inbound applications) merging into the pipeline. CSS
 * boxes + arrow glyphs — no SVG library — same convention as the
 * trainee /experience guide.
 */
function FlowChart() {
  return (
    <div className="rounded-2xl border border-line bg-card surface-shadow p-6 sm:p-8">
      <div className="flex flex-col items-stretch gap-3">
        <FlowBox
          step="Step 1"
          title="Company profile"
          href="/employer/profile"
          icon={Building2}
          tone="brand"
          hint="One-time setup · AI auto-fill from website"
        />
        <FlowArrow />
        <FlowBox
          step="Step 2"
          title="New posting"
          href="/employer/postings"
          icon={FilePlus}
          tone="brand"
          hint="Paste a JD · AI fills the fields"
        />
        <FlowArrow />

        {/* Two parallel inbound tracks */}
        <div className="mt-1 grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <div className="flex flex-col gap-3">
            <FlowMini label="Inbound" />
            <FlowBox
              step="Inbound track"
              title="Applicants"
              href="/employer/applicants"
              icon={Inbox}
              tone="neutral"
              hint="Top-of-funnel · match scores + previews"
            />
          </div>
          <div className="hidden sm:flex items-center justify-center text-subtle text-xs font-semibold uppercase tracking-[0.18em]">
            and / or
          </div>
          <div className="flex flex-col gap-3">
            <FlowMini label="Outbound" />
            <FlowBox
              step="Outbound track"
              title="Talent pool"
              href="/talent-pool"
              icon={Users}
              tone="neutral"
              hint="Browse · comment · reach out"
            />
          </div>
        </div>

        <FlowArrow />
        <FlowBox
          step="Step 3"
          title="Per-posting pipeline"
          icon={Activity}
          tone="amber"
          hint="Kanban or List · filter · bulk-select · score rubric"
        />
        <FlowArrow />
        <FlowBox
          step="Step 4"
          title="Interviews"
          icon={Calendar}
          tone="amber"
          hint="Propose slots · trainee confirms · structured scoring"
        />
        <FlowArrow />
        <FlowBox
          step="Step 5"
          title="Offer"
          icon={Send}
          tone="brand"
          hint="3 templates · markdown body · {{variable}} placeholders"
        />
        <FlowArrow />
        <FlowBox
          step="Final"
          title="Hired · e-signed"
          icon={CheckCircle2}
          tone="success"
          hint="ElectronicSignature audit row · auto-withdraws others"
        />
      </div>
    </div>
  );
}

function FlowBox({
  step, title, href, icon: Icon, tone, hint,
}: {
  step: string;
  title: string;
  href?: string;
  icon: React.ElementType;
  tone: "brand" | "neutral" | "amber" | "success";
  hint?: string;
}) {
  const toneClasses = {
    brand:   "border-brand-200 bg-brand-50 text-brand-900",
    neutral: "border-line bg-elevated text-fg",
    amber:   "border-amber-300 bg-amber-50 text-amber-900",
    success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  }[tone];
  // Boxes without an href don't get the curve-to-nav affordance,
  // so give the icon a gentle wobble — keeps the page alive and
  // signals "this is a process step, not a click target." Boxes
  // with an href use the curve hover, no animation needed.
  const iconAnim = href ? "" : "animate-icon-wobble";
  const inner = (
    <div className={`rounded-xl border-2 px-4 py-3 transition-colors hover:shadow-md ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center ${iconAnim}`}>
          <Icon size={14} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-70">
            {step}
          </p>
          <h4 className="text-sm font-bold tracking-tight">{title}</h4>
          {hint && <p className="text-xs opacity-80 mt-0.5">{hint}</p>}
        </div>
        {href && <ArrowRight size={14} className="opacity-60 shrink-0 mt-1" />}
      </div>
    </div>
  );
  if (href) return <NavHighlightZone href={href}>{inner}</NavHighlightZone>;
  return inner;
}

function FlowArrow() {
  return (
    <div className="flex justify-center text-muted py-0.5" aria-hidden>
      <ArrowDown size={18} className="animate-flow-down" />
    </div>
  );
}

function FlowMini({ label }: { label: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle text-center inline-flex flex-col items-center justify-center gap-0.5">
      <span>{label}</span>
      <ArrowDown size={10} className="animate-mini-arrow text-brand-600" aria-hidden />
    </p>
  );
}

// Silence unused-import warning for Sparkles — kept available for
// future "What's new for HR" callouts without re-importing.
void Sparkles;
