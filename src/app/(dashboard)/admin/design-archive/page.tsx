/**
 * /admin/design-archive — index of static HTML design explorations.
 *
 * Mockup HTML files live under `public/design-archive/` so they can
 * be served verbatim and opened in a new tab from this index page.
 * Each entry below is a row in the catalogue: title, description,
 * what was being explored, when, and a link out to the file itself.
 *
 * Adding a new exploration: drop the HTML into
 *   /public/design-archive/<slug>.html
 * then append an entry to the ARCHIVE_ENTRIES array below.
 *
 * Admin-only — these are working sketches, not user-facing surfaces.
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ExternalLink, Palette } from "lucide-react";

export const dynamic = "force-dynamic";

interface ArchiveEntry {
  /** Stable slug — also the filename in /public/design-archive/. */
  slug: string;
  /** Short title for the row. */
  title: string;
  /** One-or-two-sentence summary of what was explored. */
  description: string;
  /** ISO date the exploration was first archived. */
  date: string;
  /** How many distinct artefacts the file contains (for the chip). */
  count: number;
  /** Free-text label for the chip — e.g. "visual languages", "layouts". */
  countLabel: string;
  /** Optional tags for quick scan. */
  tags: string[];
}

const ARCHIVE_ENTRIES: ArchiveEntry[] = [
  {
    slug: "visual-languages-60",
    title: "Admin dashboard · 60 visual languages",
    description:
      "Survey of sixty distinct design idioms — editorial print, tech-tool, retro, cultural movements, tactile and atmospheric — all populated with the same admin content (KPIs · action queue · bench · audit log) so only typography, palette, and chrome vary. Used to pick a base visual language before exploring layout structures.",
    date: "2026-05-19",
    count: 60,
    countLabel: "visual languages",
    tags: ["Editorial", "Tech", "Retro", "Movements", "Tactile", "Mood"],
  },
  {
    slug: "vintage-ibm-10-layouts",
    title: "M35 Vintage IBM · 10 layout variations",
    description:
      "Ten ways of organising the same content on the Vintage IBM design system — tan/navy palette, hairline borders, Plex Sans + Plex Mono, no rounded corners. Same tokens across every layout; only structure changes (classic, asymmetric hero, magazine, data table, cinema banner, vertical timeline, rail + grid, mainframe report, three pillars, hero + supporting).",
    date: "2026-05-19",
    count: 10,
    countLabel: "layouts",
    tags: ["M35", "IBM", "Mainframe", "Editorial"],
  },
  {
    slug: "y2k-aero-50-layouts",
    title: "M34 Y2K Aero · 50 layout variations",
    description:
      "Fifty layout structures on the Y2K Aero visual language — translucent glass cards with pearl highlights, candy gradient backdrop, deep navy text with a faint white halo. Grouped into foundational, hero-driven, editorial, bento/mosaic, and data-driven families.",
    date: "2026-05-20",
    count: 50,
    countLabel: "layouts",
    tags: ["M34", "Y2K", "Glass", "Aero"],
  },
  {
    slug: "employer-cover-banner",
    title: "HR cover banner · wavy aurora hero",
    description:
      "The full-bleed hero that opened the original HR home page at /employer (retired 2026-05-21 when the workspace at /employer/postings became the entry point). 5-stop deep-violet-to-pink gradient stage with four corner aurora blurs (cyan / pink / amber / lime), an SVG fractal-noise grain at overlay-blend, a subtle mid-line tick, a bottom-fade shadow, and a BRAND STAGE eyebrow label. Faithful HTML port preserved for future surfaces that want a dramatic full-bleed hero.",
    date: "2026-05-21",
    count: 1,
    countLabel: "hero",
    tags: ["Hero", "Gradient", "Aurora", "Noise", "Archived"],
  },
  {
    slug: "create-resume-fx",
    title: "Create resume · 4 transition candidates",
    description:
      "Side-by-side preview of four candidate transitions for the moment between clicking 'Create' and landing in the editor. Each runs in ~500-700ms with a Replay button: A — paper sliding up from a DRAFTS drawer at the bottom; B — round rubber stamp drops in tilted, slams the sheet, lifts off with an 'ISSUED' mark behind it; C — type-on scaffold (typewriter sweep with blinking cursor); D — origami unfold from a small diamond with lingering crease lines. Pick one and the chosen primitive gets wired into ResumeCreatingOverlay.",
    date: "2026-05-21",
    count: 4,
    countLabel: "transitions",
    tags: ["Animation", "Create flow", "Resume", "Microinteraction"],
  },
  {
    slug: "design-tokens",
    title: "Design tokens · all 13 themes visualised",
    description:
      "Auto-generated single-page tour of every theme on the platform — light + 12 named variants (rosalind, sakura, mist, salty, greenwood, chilli, icecream, coldbrew, dryice, atompunk, aurora, hitech). Each theme renders its full token kit: brand ramp 50→900, semantic surface/text tokens (bg, card-solid, elevated, raised, fg, fg-muted, fg-subtle, line, popover-bg), radius scale (sm/md/lg/xl), hero-mesh palette, and a small composition mock (card + primary + secondary button + chip). Generated directly from src/app/globals.css so the visualisation never drifts from the live token defs.",
    date: "2026-05-21",
    count: 13,
    countLabel: "themes",
    tags: ["Tokens", "Themes", "Palette", "Brand ramp", "Radii", "Hero mesh"],
  },
  {
    slug: "delete-buttons-prism-covers",
    title: "Delete button · 12 prism plastic-cover variations",
    description:
      "Twelve flip-cover delete switches exploring plastic covers with angled facets and reflection geometry — faceted pyramid, chamfered bezel, diamond rib, rooftop ridge, fresnel rings, octagon-stamped housing, crystal V-grooves, twin-pitch roof, refracted prism with cyan/amber split, hex-faceted lens, single-bevel slope, saw-tooth ridges. Each cover hinges open on click. Companion piece to the canonical LaunchSwitch.",
    date: "2026-05-20",
    count: 12,
    countLabel: "covers",
    tags: ["Delete", "LaunchSwitch", "Plastic", "Facets", "Bevel", "Reflection"],
  },
  {
    slug: "delete-buttons-50",
    title: "Delete button · 50 variations",
    description:
      "Survey of delete-button motion + form. Grouped into minimal micro-animations, geometric / architectural, 8-bit Nintendo (NES classic chip, coin block, Zelda heart, Pacman munch, Tetris drop, Pong paddle, boss-bar drip), industrial / alarm (CRT scanline, hazard stripes, throbbing LED), and playful. No thick lines anywhere — motion + colour + glyph do the work.",
    date: "2026-05-20",
    count: 50,
    countLabel: "buttons",
    tags: ["Delete", "8-bit", "NES", "Pixel", "Motion", "Alarm"],
  },
];

export default async function AdminDesignArchivePage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Design archive"
        description={(
          <>
            Working sketches and visual-language explorations. Each entry below is a self-contained
            HTML file under <code className="font-mono text-fg bg-elevated px-1.5 py-0.5 rounded">public/design-archive/</code>
            — admin-only reference material we can flip back to when picking a direction for a new surface.
            Click any title to open the file in a new tab.
          </>
        )}
      />

      <div className="space-y-3">
        {ARCHIVE_ENTRIES.map((entry) => (
          <Card key={entry.slug} className="px-5 py-5">
            <div className="flex items-start gap-4 flex-wrap">
              {/* Icon + count chip on the left so the eye lands on
                  "how many artefacts" before reading the title. */}
              <div className="shrink-0 flex flex-col items-center gap-2 min-w-[72px]">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                  <Palette size={20} />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums text-fg leading-none">
                    {entry.count}
                  </div>
                  <div className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-subtle mt-0.5">
                    {entry.countLabel}
                  </div>
                </div>
              </div>

              {/* Title + description + tags + open-link on the right */}
              <div className="flex-1 min-w-0">
                <a
                  href={`/design-archive/${entry.slug}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-baseline gap-2"
                >
                  <h2 className="text-base font-semibold text-fg group-hover:text-brand-700 transition-colors">
                    {entry.title}
                  </h2>
                  <ExternalLink size={13} className="text-muted group-hover:text-brand-700 transition-colors" />
                </a>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-subtle mt-1">
                  Archived {entry.date}
                </p>
                <p className="text-sm text-muted mt-2 leading-relaxed max-w-[80ch]">
                  {entry.description}
                </p>
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {entry.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] uppercase tracking-[0.14em] font-bold text-fg-muted bg-elevated px-2 py-0.5 rounded-full ring-1 ring-inset ring-line"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Footnote on how to add a new entry — visible to admins who
          might be the ones doing the archiving. */}
      <Card className="px-5 py-4 bg-elevated/30">
        <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-subtle font-bold mb-2">
          Adding a new entry
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Drop the static HTML file into{" "}
          <code className="font-mono text-fg bg-card-solid px-1.5 py-0.5 rounded text-[12px]">
            public/design-archive/&lt;slug&gt;.html
          </code>
          {" "}then append a row to{" "}
          <code className="font-mono text-fg bg-card-solid px-1.5 py-0.5 rounded text-[12px]">
            ARCHIVE_ENTRIES
          </code>
          {" "}in{" "}
          <code className="font-mono text-fg bg-card-solid px-1.5 py-0.5 rounded text-[12px]">
            src/app/(dashboard)/admin/design-archive/page.tsx
          </code>
          {" "}— title, description, date, count, tags. No database row, no migration; the index is purely code-side.
        </p>
      </Card>
    </div>
  );
}
