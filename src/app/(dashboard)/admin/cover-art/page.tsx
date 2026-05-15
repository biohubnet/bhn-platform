import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImageIcon, Sparkles } from "lucide-react";
import {
  CourseThumbnailRegenerator,
  type ThumbnailItem,
} from "@/components/admin/CourseThumbnailRegenerator";
import { getDefaultThumbnailOverlay } from "@/lib/courses/thumbnail-overlay-default";

/**
 * /admin/cover-art — bulk-manage AI thumbnails + colour overlays
 * for every course AND pathway in the catalog.
 *
 * Renamed (was /admin/course-thumbnails) because the tool now does
 * more than just courses: pathways share the same thumbnail field
 * and overlay JSON schema, so it'd be confusing to leave them out.
 * "Cover art" reads as a designer-side concept that spans both
 * kinds. The old route is preserved as a redirect alias so any
 * bookmark / cron / old changelog link keeps working.
 *
 * Server lists every course + pathway (id + title + category +
 * current thumbnail + current overlay); the client component
 * handles per-row regen, a sequential "Regenerate selected" queue,
 * and a colour / gradient overlay batcher.
 *
 * Regeneration is run sequentially rather than in parallel because
 * Cloudflare AI has a per-account rate limit and SDXL Lightning
 * takes 4–8 s per image — sequential keeps the bar honest about
 * how long each one actually takes.
 */
export default async function CoverArtAdminPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [courses, pathways, defaultOverlay] = await Promise.all([
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        thumbnail: true,
        thumbnailOverlay: true,
        status: true,
      },
      orderBy: [{ status: "asc" }, { title: "asc" }],
    }),
    prisma.pathway.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        thumbnail: true,
        thumbnailOverlay: true,
        status: true,
      },
      orderBy: [{ status: "asc" }, { title: "asc" }],
    }),
    getDefaultThumbnailOverlay(),
  ]);

  const items: ThumbnailItem[] = [
    ...pathways.map((p) => ({ kind: "pathway" as const, ...p })),
    ...courses.map((c) => ({ kind: "course" as const, ...c })),
  ];

  const totalCount = items.length;
  const withThumbnails = items.filter((c) => c.thumbnail).length;
  const withOverlays = items.filter((c) => c.thumbnailOverlay !== null && c.thumbnailOverlay !== undefined).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Admin · Engage</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Sparkles size={22} className="text-brand-600" />
          Cover art
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl leading-snug">
          AI-generated cover art and non-destructive colour overlays for every
          course <em>and</em> pathway. The generator extracts visual motifs
          from each item&apos;s title + category + description (via LLM), then
          asks SDXL Lightning to paint a clean editorial illustration anchored
          on those motifs. After regeneration you can also stamp a shared
          colour / gradient overlay across any subset of items — handy for
          giving a series of cards a unified visual treatment without
          re-rendering each thumbnail.
        </p>
      </header>

      {/* Counts */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Courses"        value={courses.length} />
        <Stat label="Pathways"       value={pathways.length} />
        <Stat label="With thumbnails" value={withThumbnails} />
        <Stat
          label={defaultOverlay ? "Overlays · default set" : "With overlays"}
          value={withOverlays}
          accent={defaultOverlay ? "brand" : withOverlays > 0 ? "brand" : "neutral"}
        />
      </section>

      <CourseThumbnailRegenerator items={items} defaultOverlay={defaultOverlay} />

      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-sm font-semibold text-fg mb-2 inline-flex items-center gap-2">
          <ImageIcon size={14} className="text-subtle" />
          Prefer the CLI?
        </h2>
        <p className="text-xs text-muted leading-snug mb-3">
          The same SDXL pipeline runs from the command line — useful for
          off-platform batch jobs or pre-deploy seeding. Defaults to
          regenerating the entire course catalog; pass <code className="font-mono text-fg bg-elevated px-1 rounded">--missing-only</code>
          to keep existing thumbnails and only fill gaps. Pathways are
          covered by the in-platform tool above (CLI variant TBD).
        </p>
        <pre className="text-[11px] text-fg bg-elevated rounded-lg px-3 py-2 font-mono overflow-x-auto">
{`# regenerate every course thumbnail
npx tsx scripts/auto-thumbnail-courses.ts

# only fill in courses currently missing thumbnails
npx tsx scripts/auto-thumbnail-courses.ts --missing-only

# cap at 20 (useful for sanity-check runs)
npx tsx scripts/auto-thumbnail-courses.ts --limit 20`}
        </pre>
      </section>
    </div>
  );
}

function Stat({
  label, value, accent = "neutral",
}: {
  label: string;
  value: number;
  accent?: "neutral" | "amber" | "brand";
}) {
  const tints: Record<string, string> = {
    neutral: "bg-card border-line text-fg",
    amber:   "bg-amber-50 border-amber-200 text-amber-800",
    brand:   "bg-brand-50 border-brand-200 text-brand-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tints[accent]}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-tight mt-1">{value}</p>
    </div>
  );
}
