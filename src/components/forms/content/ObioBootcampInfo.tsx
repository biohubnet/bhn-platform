import {
  Calendar,
  MapPin,
  Users2,
  Coins,
  Plane,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";

/**
 * Marketing / info section that renders ABOVE the in-platform
 * registration form on /forms/obio-bootcamp.
 *
 * Mirrors the structure of the public marketing page at
 * biohubnet.ca/entrepreneurship-learning-pathway/obio-bootcamp — same
 * organization, same content, but rebuilt in the platform's own
 * design language (theme tokens, surface-shadow, brand ramp) so it
 * adapts cleanly across all themes (Daylight → Cold Brew → Hi-Tech).
 *
 * The biohubnet.ca page sends visitors to an external Google Form
 * for registration. On the platform we already have an internal form
 * (EventFormView with slug "obio-bootcamp") — better UX because the
 * trainee is authenticated and the submission lands in the admin
 * inbox alongside their other applications. So this page renders the
 * marketing context up top and the in-platform form below.
 */
export function ObioBootcampInfo() {
  return (
    <div className="space-y-8 mb-10">
      <Hero />
      <AtAGlance />
      <Timeline />
      <Curriculum />
      <ExperienceSection />
      <Impact />
      <TravelSupport />
      {/*
        Testimonials block ("Section 04 — Voices" on biohubnet.ca)
        intentionally not rendered here. Verbatim quotes belong with
        their attribution; once those are confirmed, drop a <Voices />
        section between <Impact /> and <TravelSupport />.
      */}
    </div>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="rounded-2xl border border-line bg-card p-6 sm:p-8 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
        Entrepreneurship Learning Pathway
      </p>
      <h1 className="text-2xl sm:text-4xl font-bold text-fg mt-1.5 tracking-tight">
        OBIO Entrepreneurship Bootcamp
      </h1>
      <p className="text-base text-muted mt-4 max-w-3xl leading-relaxed">
        Designed for trainees leading life-sciences ventures at the pre-seed
        stage — at minimum, an invention disclosure filed with your home
        institution. Trainee-entrepreneurs get individualized support to map
        their skill and knowledge gaps, then access tailored resources and
        mentorship that move the venture toward its next milestone.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Tag>3½-day intensive</Tag>
        <Tag>Trainee entrepreneurs</Tag>
        <Tag>Pitch to investors</Tag>
      </div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
      {children}
    </span>
  );
}

/* ─── Bootcamp at a glance ────────────────────────────────────────── */

function AtAGlance() {
  const stats: { icon: React.ElementType; label: string; value: string }[] = [
    { icon: Calendar, label: "Dates",    value: "July 20–24, 2026" },
    { icon: MapPin,   label: "Location", value: "Toronto, ON" },
    { icon: Users2,   label: "Format",   value: "In person" },
    { icon: Coins,    label: "Cost",     value: "Training Credits — eligible HQP, no out-of-pocket" },
  ];
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-4">
        Bootcamp at a glance
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle">
                  {s.label}
                </p>
                <p className="text-sm font-semibold text-fg leading-snug mt-0.5">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Timeline ────────────────────────────────────────────────────── */

function Timeline() {
  const phases: {
    when: string;
    title: string;
    body: string;
    mode: "Virtual" | "In person";
  }[] = [
    {
      when: "Week of Jul 6, 2026",
      title: "Pre-training",
      body: "Skills assessment, orientation, prep material, and onboarding support before bootcamp week.",
      mode: "Virtual",
    },
    {
      when: "Jul 20–24, 2026",
      title: "Bootcamp",
      body: "Five intensive days of training, workshops, panels, networking, and pitching to investors.",
      mode: "In person",
    },
    {
      when: "Week of Aug 3, 2026",
      title: "Post-training",
      body: "Outcome assessment plus a personalized action plan to keep momentum going after bootcamp week ends.",
      mode: "Virtual",
    },
    {
      when: "+6 months",
      title: "Follow-up",
      body: "Program-impact survey to track venture progress and capture longitudinal outcomes.",
      mode: "Virtual",
    },
  ];
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Bootcamp timeline
        </p>
        <p className="text-xs text-muted inline-flex items-center gap-1.5">
          <Clock size={12} />
          <span>~40 hours total commitment</span>
        </p>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {phases.map((p, i) => (
          <li
            key={p.title}
            className="relative rounded-xl border border-line bg-elevated p-4"
          >
            <span className="absolute -top-2 left-4 inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-bold">
              {i + 1}
            </span>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle mt-2">
              {p.when}
            </p>
            <h3 className="text-sm font-bold text-fg mt-1">{p.title}</h3>
            <p className="text-xs text-muted leading-snug mt-1.5">{p.body}</p>
            <span
              className={`inline-block mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded ${
                p.mode === "In person"
                  ? "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200"
                  : "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200"
              }`}
            >
              {p.mode}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─── Section 01 — Curriculum ─────────────────────────────────────── */

function Curriculum() {
  const groups: { title: string; items: string[] }[] = [
    {
      title: "Market & Industry Insights",
      items: [
        "Market overview and forecast",
        "Market access overview",
      ],
    },
    {
      title: "Product Development, Commercialization & IP",
      items: [
        "Overview of product development",
        "Commercialization pathways",
        "Commercialization of research",
        "Scientific and clinical validation",
        "Intellectual-property strategy",
        "Licensing — terms, mechanics, and negotiations",
      ],
    },
    {
      title: "Regulatory & Legal",
      items: [
        "Regulatory overview",
        "Regulatory process and approvals",
        "Incorporation and corporate-structure strategies",
      ],
    },
    {
      title: "Business Planning, Finance & Growth",
      items: [
        "Business plans, budgeting, and financial forecasting",
        "Financing — Seed, Angel, VC, family trust, big-pharma",
        "Introduction to exit strategies",
        "Non-dilutive funding",
      ],
    },
  ];
  return (
    <NumberedSection number="01" eyebrow="Curriculum" title="What you'll cover">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((g) => (
          <div
            key={g.title}
            className="rounded-xl border border-line bg-elevated p-4"
          >
            <h3 className="text-sm font-bold text-fg tracking-tight mb-2">{g.title}</h3>
            <ul className="space-y-1.5">
              {g.items.map((it) => (
                <li
                  key={it}
                  className="text-xs text-fg flex items-start gap-2 leading-snug"
                >
                  <CheckCircle2 size={11} className="text-brand-600 shrink-0 mt-0.5" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </NumberedSection>
  );
}

/* ─── Section 02 — Experience ─────────────────────────────────────── */

function ExperienceSection() {
  return (
    <NumberedSection
      number="02"
      eyebrow="Experience"
      title="Hands-on workshops, expert panels, networking"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-line bg-elevated p-4">
          <h3 className="text-sm font-bold text-fg tracking-tight mb-2">Workshops</h3>
          <ul className="space-y-1.5">
            {[
              "Pitch clinic with investor feedback",
              "Target Product Profile workshop",
              "Regulatory Strategy workshop",
              "Business Plan development",
            ].map((it) => (
              <li
                key={it}
                className="text-xs text-fg flex items-start gap-2 leading-snug"
              >
                <CheckCircle2 size={11} className="text-brand-600 shrink-0 mt-0.5" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-elevated p-4">
          <h3 className="text-sm font-bold text-fg tracking-tight mb-2">Panels</h3>
          <ul className="space-y-1.5">
            {["Startup founders panel", "Commercialization panel"].map((it) => (
              <li
                key={it}
                className="text-xs text-fg flex items-start gap-2 leading-snug"
              >
                <CheckCircle2 size={11} className="text-brand-600 shrink-0 mt-0.5" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </NumberedSection>
  );
}

/* ─── Section 03 — Bootcamp impact ────────────────────────────────── */

function Impact() {
  const stats: { value: string; caption: string }[] = [
    {
      value: "100%",
      caption: "Gained valuable connections with entrepreneurs, industry experts, and advisors",
    },
    {
      value: "100%",
      caption: "Increased understanding of the skills and knowledge needed to launch a start-up",
    },
    {
      value: "95%",
      caption: "Improved understanding of pitch-deck preparation and funding strategies",
    },
  ];
  return (
    <NumberedSection number="03" eyebrow="Impact" title="What past participants say">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.caption}
            className="rounded-xl border border-line bg-elevated p-5 text-center"
          >
            <p className="text-4xl sm:text-5xl font-bold text-brand-600 tabular-nums tracking-tight">
              {s.value}
            </p>
            <p className="text-xs text-muted leading-snug mt-2">{s.caption}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-subtle mt-3 leading-snug flex items-start gap-1.5">
        <TrendingUp size={11} className="text-subtle shrink-0 mt-0.5" />
        <span>
          Based on participant surveys from previous bootcamps. Stats reflect
          ratings of 4 or 5 (satisfied / very satisfied).
        </span>
      </p>
    </NumberedSection>
  );
}

/* ─── Travel & accommodation support ──────────────────────────────── */

function TravelSupport() {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
        <Plane size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Travel & accommodation support
        </p>
        <p className="text-sm text-fg mt-1 leading-snug">
          Available for participants travelling more than two hours to the
          training site.
        </p>
        <p className="text-xs text-muted mt-2 leading-snug">
          Note your needs in the <span className="font-semibold text-fg">Travel / Accommodation Support</span> field
          when you register below — an admin will follow up after reviewing
          your submission.
        </p>
      </div>
    </section>
  );
}

/* ─── Numbered-section wrapper ────────────────────────────────────── */

/**
 * Numbered-section header treatment matching biohubnet.ca's "Section 01
 * / Section 02 / …" pattern. The big numeral sits as a tinted outline
 * to the left of the eyebrow + title block; on small screens it
 * collapses above the heading.
 */
function NumberedSection({
  number, eyebrow, title, children,
}: {
  number: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <header className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-5 mb-5">
        <span
          aria-hidden
          className="text-5xl sm:text-6xl font-bold leading-none tracking-tight text-brand-200"
          style={{ WebkitTextStroke: "1px var(--color-brand-400)" }}
        >
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            {eyebrow}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-fg mt-1 tracking-tight">
            {title}
          </h2>
        </div>
      </header>
      {children}
    </section>
  );
}
