/**
 * POST /api/admin/courses/[id]/thumbnail/regenerate
 *
 * Regenerate a single course's AI thumbnail in-platform — same
 * pipeline as scripts/auto-thumbnail-courses.ts, exposed as an
 * endpoint so admins can trigger it from the UI without CLI access.
 *
 * Steps:
 *   1. LLM extracts 3–5 visual motifs from title + category + tags + description
 *   2. SDXL renders an editorial illustration anchored on those motifs
 *   3. PNG uploaded to R2 at a timestamped key
 *   4. Course.thumbnail updated to the new URL
 *   5. Previous R2 object best-effort deleted
 *
 * Returns the new URL + the motifs the LLM picked, so the UI can
 * render the new thumbnail and surface what visual elements drove it.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateImage,
  extractThumbnailMotifs,
  buildTopicThumbnailPrompt,
  AI_CONFIGURED,
} from "@/lib/ai";
import {
  putR2Object,
  r2PublicUrl,
  R2_PUBLIC_URL,
  deleteR2ObjectByUrl,
} from "@/lib/r2";
import { applyDefaultOverlayIfAbsent } from "@/lib/courses/thumbnail-overlay-default";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!AI_CONFIGURED.image) {
    return NextResponse.json({ error: "Image generation not configured." }, { status: 503 });
  }
  if (!R2_PUBLIC_URL) {
    return NextResponse.json({ error: "R2 not configured." }, { status: 503 });
  }

  const { id } = await ctx.params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true, title: true, category: true, tags: true, description: true, thumbnail: true,
    },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const adminId = (session.user as { id?: string }).id ?? null;

  // 1. Motifs
  const motifs = await extractThumbnailMotifs(
    {
      title: course.title,
      category: course.category,
      tags: course.tags,
      description: course.description,
    },
    { feature: "thumbnail_motif", userId: adminId },
  );

  // 2. Prompt
  const prompt = buildTopicThumbnailPrompt({
    title: course.title,
    category: course.category,
    motifs,
  });

  // 3. Render
  const png = await generateImage(prompt, {
    feature: "thumbnail_course_admin",
    userId: adminId,
    steps: 8,
  });
  if (!png) {
    return NextResponse.json(
      { error: "Image generation failed — see AIInteraction log for details." },
      { status: 502 },
    );
  }

  // 4. Upload + persist
  const key = `thumbnails/courses/${course.id}/${Date.now()}.png`;
  await putR2Object(key, Buffer.from(png), "image/png");
  const url = r2PublicUrl(key);
  const previousUrl = course.thumbnail;
  await prisma.course.update({ where: { id: course.id }, data: { thumbnail: url } });

  // 5. Best-effort cleanup of the old R2 object.
  if (previousUrl && previousUrl !== url) {
    try { await deleteR2ObjectByUrl(previousUrl); } catch { /* non-fatal */ }
  }

  // 6. Apply the platform-wide default overlay if one is configured
  //    AND this course doesn't already have its own. Lets admins set
  //    a "house style" once on /admin/cover-art and have every future
  //    thumbnail pick it up automatically. Per-course customisations
  //    win and are not overwritten.
  await applyDefaultOverlayIfAbsent("course", course.id).catch(() => null);

  return NextResponse.json({
    ok: true,
    courseId: course.id,
    title: course.title,
    thumbnail: url,
    motifs,
  });
}
