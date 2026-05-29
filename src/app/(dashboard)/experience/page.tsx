import { Compass, FileText, Briefcase, ClipboardList, Lightbulb, Calendar, ArrowDown, ArrowRight, CheckCircle2, Users } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { NavHighlight, NavHighlightZone } from "@/components/guide/NavHighlight";

/**
 * /experience — Program guide.
 *
 * Plain-English explainer for the EXPERIENCE side of the platform —
 * the matching marketplace that wires trainee profiles to industry
 * partners. Walks through the trainee journey end to end, with
 * every mention of a sidebar item rendered as a NavHighlight pill
 * that pulses the corresponding nav row on hover. So a reader can
 * skim the page and instantly map "the talent application" → "the
 * row in my sidebar called Talent Application" without hunting.
 *
 * Flow chart is hand-built with CSS boxes + arrows rather than an
 * SVG library — the diagram is small, single-purpose, and matches
 * the surrounding type ramp better than anything we'd get from a
 * generic graph library.
 */
export default function ExperienceGuidePage() {
  return (
    <div>
      <PageHero
        eyebrow={<><Compass size={11} /> Program guide</>}
        title="The EXPERIENCE program — how it works"
        description="Build your application materials once, submit yourself to the talent pool, browse industry postings, and let admins + employers wire you to the right placement. Hover any highlighted name in this guide to find the matching control in your sidebar."
        tone="brand"
      />

      {/* Flow chart */}
      <section className="max-w-3xl mx-auto px-2 sm:px-0 -mt-2 mb-12">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-6">
          At a glance · the trainee journey
        </h2>
        <FlowChart />
      </section>

      {/* Step-by-step */}
      <section className="max-w-3xl mx-auto px-2 sm:px-0 space-y-7 mb-12">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle">
          Step-by-step
        </h2>

        <Step
          n={1}
          icon={FileText}
          title="Build your application materials once"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              Open <NavHighlight href="/profile/application">Application Builder</NavHighlight>{" "}
              and put together your reusable kit: a resume PDF, a
              one-minute video introduction, and a written elevator
              pitch. You do this once. Every other application form on
              the platform pre-fills with these assets and lets you
              tweak per opportunity — no more re-uploading the same
              resume to ten different postings.
            </p>
          )}
        />

        <Step
          n={2}
          icon={Briefcase}
          title="Submit to the talent pool"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              <NavHighlight href="/forms/talent-application">Talent Application</NavHighlight>{" "}
              is the long form: bio, supervisor letter, transcript,
              STAR-format video, career interests. An admin reviews
              every submission; approved entries become visible to
              vetted industry partners on the talent pool. While
              you&apos;re pending, you can keep editing the form. While
              you&apos;re approved, employers can comment privately on
              your file and reach out — those conversations show up in
              your application tracker.
            </p>
          )}
        />

        <Step
          n={3}
          icon={Briefcase}
          title="Browse the open postings"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              <NavHighlight href="/internships">Internship Opportunities</NavHighlight>{" "}
              is a live job board of internship and co-op postings
              from BHN industry partners. Apply directly from each
              posting — the application builder fields pre-fill, you
              add a per-posting cover note, submit. Saved postings get
              a heart icon so you can come back to them later.
            </p>
          )}
        />

        <Step
          n={4}
          icon={ClipboardList}
          title="Track every application in one place"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              <NavHighlight href="/profile/applications">Application Tracker</NavHighlight>{" "}
              gathers every application you&apos;ve submitted across the
              platform — talent-pool entry plus every direct posting
              application — into a single status board. Submitted →
              Reviewed → Interview → Offer. You can filter by stage,
              jump back to any application to add a note, or withdraw
              an application that&apos;s no longer relevant.
            </p>
          )}
        />

        <Step
          n={5}
          icon={Lightbulb}
          title="Skills surface relevant work"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              Every course you complete contributes to your{" "}
              <NavHighlight href="/profile/skills">My Skills</NavHighlight>{" "}
              profile. The platform maps your skill graph against open
              postings and surfaces the ones you&apos;d be strong for at
              the top of the board — so you spend less time scrolling
              and more time applying to the right things.
            </p>
          )}
        />

        <Step
          n={6}
          icon={Calendar}
          title="Interviews land in one calendar"
          body={(
            <p className="text-sm text-fg leading-relaxed">
              When an employer schedules an interview, it appears on{" "}
              <NavHighlight href="/interviews">Interviews</NavHighlight>{" "}
              with the date, format (phone / video / on-site), join
              link, and the prep notes the employer attached. Both
              you and the employer see the same record — no parallel
              email thread to lose track of.
            </p>
          )}
        />
      </section>

      {/* Tips strip */}
      <section className="max-w-3xl mx-auto px-2 sm:px-0 mb-16">
        <div className="rounded-2xl border border-line bg-card surface-shadow p-5">
          <h3 className="text-sm font-semibold text-fg mb-3 inline-flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Practical tips
          </h3>
          <ul className="space-y-2 text-sm text-muted leading-relaxed">
            <li>
              <strong className="text-fg">Update Application Builder before you apply.</strong>{" "}
              Every form pulls from there at submit time — a fresh
              resume in the Builder = a fresh resume on every
              application you fire off afterwards.
            </li>
            <li>
              <strong className="text-fg">Pending ≠ rejected.</strong>{" "}
              The talent application is admin-reviewed; pending
              status simply means the queue hasn&apos;t reached you yet.
              Most reviews happen within two business days.
            </li>
            <li>
              <strong className="text-fg">You can leave the talent pool any time.</strong>{" "}
              There&apos;s a Leave button at the bottom of the talent
              application — short exit survey, single click, done.
              You can re-enter later if your situation changes.
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
  // paint (1 bobs first, 2 a quarter cycle later, etc.). Hover
  // scales the chip a notch and accelerates the cycle.
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
 * Vertical flow chart with one branching node (admin review).
 * CSS boxes + arrow glyphs — no SVG, no graph library. Each box
 * is a NavHighlight when it maps to a sidebar item, so hover →
 * matching nav row lights up.
 */
function FlowChart() {
  return (
    <div className="rounded-2xl border border-line bg-card surface-shadow p-6 sm:p-8">
      <div className="flex flex-col items-stretch gap-3">
        <FlowBox
          step="Step 1"
          title="Application Builder"
          href="/profile/application"
          icon={FileText}
          tone="brand"
          hint="Resume · 1-min video · elevator pitch"
        />
        <FlowArrow />
        <FlowBox
          step="Step 2"
          title="Talent Application"
          href="/forms/talent-application"
          icon={Briefcase}
          tone="brand"
          hint="Full application → talent pool"
        />
        <FlowArrow />
        <FlowBox
          step="Admin gate"
          title="Admin review"
          icon={Users}
          tone="amber"
          hint="Approved ⇒ visible to employers"
          cli={[
            { c: "▸", t: "reading application…" },
            { c: "✎", t: "comment: strong STAR video" },
            { c: "★", t: "scored 4.6 / 5" },
            { c: "✓", t: "approved → talent pool" },
          ]}
        />

        {/* Two parallel tracks */}
        <div className="mt-3 grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <div className="flex flex-col gap-3">
            <FlowMini label="Pool track" />
            <FlowBox
              step="Pool track"
              title="Talent Pool"
              icon={Users}
              tone="neutral"
              hint="Employers comment + reach out"
              cli={[
                { c: "◆", t: "employer viewing profile" },
                { c: "✎", t: "left a private comment" },
                { c: "✉", t: "intro message sent" },
                { c: "↗", t: "shortlisted for a role" },
              ]}
            />
          </div>
          <div className="hidden sm:flex items-center justify-center text-subtle text-xs font-semibold uppercase tracking-[0.18em]">
            or
          </div>
          <div className="flex flex-col gap-3">
            <FlowMini label="Self-apply track" />
            <FlowBox
              step="Self-apply track"
              title="Internship Opportunities"
              href="/internships"
              icon={Briefcase}
              tone="neutral"
              hint="Live job board · apply directly"
              fill
              points={[
                "Roles from BHN partners",
                "Apply on the company's site",
                "No admin gate — go direct",
                "New postings added often",
              ]}
            />
          </div>
        </div>

        <FlowArrow />
        <FlowBox
          step="Track"
          title="Application Tracker"
          href="/profile/applications"
          icon={ClipboardList}
          tone="brand"
          hint="Every submission in one status board"
        />
        <FlowArrow />
        <FlowBox
          step="Final"
          title="Interviews"
          href="/interviews"
          icon={Calendar}
          tone="success"
          hint="Date, format, link, prep notes"
        />
      </div>
    </div>
  );
}

function FlowBox({
  step, title, href, icon: Icon, tone, hint, cli, points, fill,
}: {
  step: string;
  title: string;
  href?: string;
  icon: React.ElementType;
  tone: "brand" | "neutral" | "amber" | "success";
  hint?: string;
  /** A line-less box (no nav curve) can carry a CLI-style activity
   *  vignette in its body to show "work happening" (Admin review,
   *  Talent Pool). */
  cli?: { c: string; t: string }[];
  /** Plain info bullets in the box body — used to fill a box with real
   *  content (the Self-apply box, which keeps its nav curve and isn't a
   *  candidate for the dark CLI panel). */
  points?: string[];
  /** Stretch this box to fill its column height so the shorter box in a
   *  two-track row bottom-aligns with the taller one. Relies on the
   *  parent being a flex column of definite (stretched) height. */
  fill?: boolean;
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
  const iconAnim = href || cli ? "" : "animate-icon-wobble";
  const inner = (
    <div className={`rounded-xl border-2 px-4 py-3 transition-colors hover:shadow-md ${toneClasses}${fill ? " flex-1" : ""}`}>
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
          {cli && <CliVignette lines={cli} />}
          {points && points.length > 0 && (
            <ul className="mt-2 space-y-1">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-1.5 text-[11px] leading-snug opacity-80">
                  <span aria-hidden className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {href && <ArrowRight size={14} className="opacity-60 shrink-0 mt-1" />}
      </div>
    </div>
  );
  // `fill` lets a short box stretch to its (grid-stretched) column's
  // full height so its bottom lines up with a taller sibling. Needs the
  // flex chain: column → this wrapper (flex-1) → inner (flex-1).
  if (href) return <NavHighlightZone href={href} className={fill ? "no-underline flex flex-col flex-1" : undefined}>{inner}</NavHighlightZone>;
  return inner;
}

/**
 * CLI-style activity vignette — a tiny dark terminal panel that loops a
 * few monospace "log" lines so a line-less box (Admin review, Talent
 * Pool) reads as live work happening rather than a static label. Lines
 * reveal in sequence (staggered .cli-line delay) with a blinking cursor.
 * Purely decorative (aria-hidden); dark by design regardless of theme.
 */
function CliVignette({ lines }: { lines: { c: string; t: string }[] }) {
  return (
    <div
      aria-hidden
      className="mt-2.5 rounded-lg px-2.5 py-2 font-mono text-[10.5px] leading-[1.55] ring-1 ring-white/10 overflow-hidden"
      style={{ background: "#0b1220" }}
    >
      {lines.map((ln, i) => (
        <div
          key={i}
          className="cli-line flex items-center gap-1.5 whitespace-nowrap"
          style={{ animationDelay: `${(i * 1.1).toFixed(2)}s` }}
        >
          <span className="shrink-0 w-3 text-center" style={{ color: "#5eead4" }}>{ln.c}</span>
          <span className="truncate" style={{ color: "#cbd5e1" }}>{ln.t}</span>
          {i === lines.length - 1 && (
            <span className="cli-cursor shrink-0" style={{ color: "#5eead4" }}>▋</span>
          )}
        </div>
      ))}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center text-muted py-0.5" aria-hidden>
      <ArrowDown size={18} className="animate-flow-down" />
    </div>
  );
}

function FlowMini({ label }: { label: string }) {
  // Mini label above a track box. Subtle animated chevron + label
  // pairing — calls the eye to look down into the box without
  // adding another full FlowArrow row to the chart's vertical
  // rhythm.
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle text-center inline-flex flex-col items-center justify-center gap-0.5">
      <span>{label}</span>
      <ArrowDown size={10} className="animate-mini-arrow text-brand-600" aria-hidden />
    </p>
  );
}
