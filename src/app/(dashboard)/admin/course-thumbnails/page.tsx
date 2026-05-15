import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImageIcon, Sparkles } from "lucide-react";
import { CourseThumbnailRegenerator } from "@/components/admin/CourseThumbnailRegenerator";

/**
 * /admin/course-thumbnails — bulk regenerate AI thumbnails for the
 * entire course catalog.
 *
 * Server lists all courses (id + title + category + current thumbnail);
 * the client component handles per-course regen + a "Regenerate all"
 * sequential queue that calls the per-course endpoint one at a time
 * and renders progress.
 *
 * Done sequentially rather than in parallel because Cloudflare AI
 * has a per-account rate limit and SDXL Lightning takes 4–8 s per
 * image — sequential keeps the bar honest about how long each one
 * actually takes.
 */
export default async function CourseThumbnailsAdminPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      thumbnail: true,
      thumbnailOverlay: true,
      status: true,
    },
    orderBy: [{ status: "asc" }, { title: "asc" }],
  });

  const withThumbnails = courses.filter((c) => c.thumbnail).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Admin · Engage</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Sparkles size={22} className="text-brand-600" />
          Course thumbnails
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl leading-snug">
          AI-generated cover art for every course. The generator extracts
          3–5 concrete visual motifs from each course's title + category +
          description (via LLM), then asks SDXL Lightning to paint a clean
          editorial illustration anchored on those motifs — so the
          thumbnail actually reflects the course topic instead of being a
          generic abstract gradient.
        </p>
      </header>

      {/* Counts */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Total courses"          value={courses.length} />
        <Stat label="With thumbnails"        value={withThumbnails} />
        <Stat label="Missing"                value={courses.length - withThumbnails} accent="amber" />
      </section>

      <CourseThumbnailRegenerator courses={courses} />

      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-sm font-semibold text-fg mb-2 inline-flex items-center gap-2">
          <ImageIcon size={14} className="text-subtle" />
          Prefer the CLI?
        </h2>
        <p className="text-xs text-muted leading-snug mb-3">
          The same pipeline runs from the command line — useful for
          off-platform batch jobs or pre-deploy seeding. Defaults to
          regenerating the entire catalog; pass <code className="font-mono text-fg bg-elevated px-1 rounded">--missing-only</code>
          to keep existing thumbnails and only fill gaps.
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
  accent?: "neutral" | "amber";
}) {
  const tints: Record<string, string> = {
    neutral: "bg-card border-line text-fg",
    amber:   "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tints[accent]}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-tight mt-1">{value}</p>
    </div>
  );
}
