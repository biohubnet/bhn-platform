"use client";
/**
 * 10 candidate visual treatments for the ADMINISTRATION
 * sub-group separators in the LMS sidebar.
 *
 * Each sample renders a mini-sidebar fragment with three
 * representative sub-groups (Engage / Equip / Platform), each
 * containing three items, styled the same way the real
 * Sidebar.tsx would render them — same NavLink chrome, same
 * AdminSubheading typography — but with the proposed separator
 * applied on top.
 *
 * The user reviews this page, picks an option by number, then
 * we apply that treatment to the real Sidebar.tsx in a
 * follow-up commit. Nothing here changes the live sidebar.
 */
import {
  GraduationCap, Briefcase, Rocket, Inbox, Users, MessageSquare,
  Award, Sparkles, FileText, Settings,
} from "lucide-react";

type Tone = "engage" | "experience" | "equip" | "insights" | "platform" | "security" | "system";

interface SampleItem {
  label: string;
  icon: React.ReactNode;
}
interface SampleGroup {
  label: string;
  tone: Tone;
  items: SampleItem[];
}

/** Three representative sub-groups for the samples. Same content
 *  across all 10 options so the only variable is the separator
 *  treatment. */
const SAMPLE_GROUPS: SampleGroup[] = [
  {
    label: "Engage",
    tone: "engage",
    items: [
      { label: "Manage enrollments", icon: <GraduationCap size={13} /> },
      { label: "Credit applications", icon: <Award size={13} /> },
      { label: "Manage certificates", icon: <Sparkles size={13} /> },
    ],
  },
  {
    label: "Equip",
    tone: "equip",
    items: [
      { label: "Equip overview", icon: <Rocket size={13} /> },
      { label: "Equip review", icon: <Briefcase size={13} /> },
      { label: "Equip deadlines", icon: <FileText size={13} /> },
    ],
  },
  {
    label: "Platform",
    tone: "platform",
    items: [
      { label: "Inbox", icon: <Inbox size={13} /> },
      { label: "Users", icon: <Users size={13} /> },
      { label: "Feedback", icon: <MessageSquare size={13} /> },
    ],
  },
];

/** Per-tone colour hex — used by options that paint accents
 *  (left bar, dot, frame) per group. */
const TONE_COLOURS: Record<Tone, string> = {
  engage:     "#10b981", // emerald
  experience: "#f59e0b", // amber
  equip:      "#0ea5e9", // sky
  insights:   "#8b5cf6", // violet
  platform:   "#0891b2", // cyan
  security:   "#f43f5e", // rose
  system:     "#6b7280", // slate
};

/** A faithful copy of the real NavLink visual — used inside
 *  every sample so we're comparing apples to apples. The actual
 *  NavLink does more (active state, badges, etc.); the sample
 *  needs only the visual shell. */
function FakeNavLink({ icon, label }: SampleItem) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-fg/85 hover:bg-elevated/40 cursor-default">
      <span className="text-muted shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

/** Mini-sidebar shell that every option renders inside. The
 *  width matches the real sidebar's md:w-64 so the samples
 *  feel real. */
function SampleShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden surface-shadow">
      <header className="px-3 py-2 border-b border-line bg-elevated/30 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fg">{title}</p>
        <code className="text-[9px] text-subtle font-mono">option</code>
      </header>
      <div className="bg-card-solid/60 px-2 py-3 w-[240px]">
        <p className="px-3 pb-2 text-[9px] uppercase tracking-[0.24em] font-bold text-violet-700/80">
          Administration
        </p>
        {children}
      </div>
    </div>
  );
}

// ── Sample 1 — Hairline divider above ─────────────────────────
function Sample1() {
  return (
    <SampleShell title="01 · Hairline above">
      {SAMPLE_GROUPS.map((g, i) => (
        <div key={g.label} className={i > 0 ? "border-t border-line/60 mt-2 pt-2" : ""}>
          <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{g.label}</p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 2 — Left accent bar (tone-coloured) ────────────────
function Sample2() {
  return (
    <SampleShell title="02 · Left accent bar">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="relative pl-2 mb-2">
          <span
            className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
            style={{ background: TONE_COLOURS[g.tone] }}
          />
          <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{g.label}</p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 3 — Numbered prefix ────────────────────────────────
function Sample3() {
  return (
    <SampleShell title="03 · Numbered prefix">
      {SAMPLE_GROUPS.map((g, i) => (
        <div key={g.label} className="mt-2 first:mt-0">
          <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            <span className="font-mono text-subtle/60 mr-1.5">{String(i + 1).padStart(2, "0")}</span>
            {g.label}
          </p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 4 — Indented tinted block ──────────────────────────
function Sample4() {
  return (
    <SampleShell title="04 · Indented tinted block">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="rounded-xl bg-elevated/40 px-1 py-1.5 mb-2 last:mb-0">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{g.label}</p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 5 — Card per subgroup ──────────────────────────────
function Sample5() {
  return (
    <SampleShell title="05 · Card per subgroup">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="rounded-lg bg-card-solid border border-line/60 px-1 py-1.5 mb-2 last:mb-0">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{g.label}</p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 6 — Tone dot prefix ────────────────────────────────
function Sample6() {
  return (
    <SampleShell title="06 · Tone dot prefix">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="mt-2 first:mt-0">
          <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: TONE_COLOURS[g.tone], boxShadow: `0 0 6px ${TONE_COLOURS[g.tone]}66` }}
            />
            {g.label}
          </p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 7 — Icon prefix ────────────────────────────────────
function Sample7() {
  const groupIcons: Record<Tone, React.ReactNode> = {
    engage:     <GraduationCap size={11} />,
    experience: <Briefcase size={11} />,
    equip:      <Rocket size={11} />,
    insights:   <Sparkles size={11} />,
    platform:   <Settings size={11} />,
    security:   <FileText size={11} />,
    system:     <Settings size={11} />,
  };
  return (
    <SampleShell title="07 · Icon prefix">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="mt-2 first:mt-0">
          <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
            <span style={{ color: TONE_COLOURS[g.tone] }} className="shrink-0">{groupIcons[g.tone]}</span>
            {g.label}
          </p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 8 — Underline rule under heading ──────────────────
function Sample8() {
  return (
    <SampleShell title="08 · Underline rule">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="mt-3 first:mt-0">
          <div className="mx-3 mb-1 border-b border-line/60 pb-1">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{g.label}</p>
          </div>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 9 — Spaced typography (bigger heading) ─────────────
function Sample9() {
  return (
    <SampleShell title="09 · Spaced typography">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="mt-5 first:mt-1">
          <p className="px-3 pb-2 text-[11px] uppercase tracking-[0.24em] font-extrabold text-fg/85">{g.label}</p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

// ── Sample 10 — Frame (top + bottom hairlines) ───────────────
function Sample10() {
  return (
    <SampleShell title="10 · Frame (top + bottom)">
      {SAMPLE_GROUPS.map((g) => (
        <div key={g.label} className="border-y border-line/40 mt-2 first:mt-0 first:border-t-0 py-1.5">
          <p className="px-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{g.label}</p>
          {g.items.map((it) => <FakeNavLink key={it.label} {...it} />)}
        </div>
      ))}
    </SampleShell>
  );
}

const SAMPLES: { id: number; render: () => React.ReactNode; description: string }[] = [
  {
    id: 1,
    render: () => <Sample1 />,
    description: "1 px hairline above every sub-heading (except the first). Minimal — almost invisible at rest but enough to slot each group into its own band. Plays nice with any colour theme.",
  },
  {
    id: 2,
    render: () => <Sample2 />,
    description: "2 px vertical bar in each sub-group's tone colour along the left edge of the items. Strong visual anchor; lets you scan the column by colour. Costs ~6 px of horizontal real-estate.",
  },
  {
    id: 3,
    render: () => <Sample3 />,
    description: "Numbered prefix on the heading: 01 · ENGAGE, 02 · EXPERIENCE … Mono digits, dimmed. Gives an implicit reading order without chrome — but requires consistent numbering forever.",
  },
  {
    id: 4,
    render: () => <Sample4 />,
    description: "Each sub-group wrapped in a subtle bg-elevated/40 rounded block. Soft container; reads as a section without using lines. More chrome than hairlines, less than full cards.",
  },
  {
    id: 5,
    render: () => <Sample5 />,
    description: "Each sub-group is its own bordered card (bg-card-solid + border + rounded-lg). Strongest separation. Best when groups are short; can feel busy with many groups.",
  },
  {
    id: 6,
    render: () => <Sample6 />,
    description: "Tiny coloured dot prefix on the heading, in the sub-group's tone colour with a soft glow. Subtle but immediately readable. Pairs well with hairline (1) if you want both.",
  },
  {
    id: 7,
    render: () => <Sample7 />,
    description: "Lucide icon prefix on the heading (graduation cap for Engage, rocket for Equip, etc.) in the tone colour. Adds visual identity without lines. Iconography needs curation.",
  },
  {
    id: 8,
    render: () => <Sample8 />,
    description: "1 px underline rule directly under the heading text, padded inside the column. Heading reads as a 'section title' with the underline anchoring it. Quiet but structured.",
  },
  {
    id: 9,
    render: () => <Sample9 />,
    description: "Pure typography — bigger top margin (≈20 px gap), heading bumped to text-[11px] extrabold with wider tracking. No lines, no chrome. Only spacing + weight does the work.",
  },
  {
    id: 10,
    render: () => <Sample10 />,
    description: "Top + bottom hairline around each sub-group with a touch of vertical padding. Reads as a framed strip per group — heavier than (1) but still no fills.",
  },
];

export function SidebarGroupingSamples() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {SAMPLES.map((s) => (
          <div key={s.id} className="space-y-3">
            {s.render()}
            <p className="text-xs text-muted leading-snug max-w-xs">
              <strong className="text-fg font-mono">Option {s.id}.</strong>{" "}
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
