import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { generateImage, buildThumbnailPrompt, AI_CONFIGURED } from "@/lib/ai";
import { putR2Object, r2PublicUrl, R2_PUBLIC_URL } from "@/lib/r2";
import { trackServer } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = (session.user as { id?: string }).id;
  if (!AI_CONFIGURED.image) {
    return NextResponse.json({ error: "Image generation not configured." }, { status: 500 });
  }
  if (!R2_PUBLIC_URL) {
    return NextResponse.json({ error: "R2 storage not configured." }, { status: 500 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, category: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const customPrompt = (body.prompt as string | undefined)?.trim();
  const prompt = customPrompt && customPrompt.length > 5
    ? customPrompt
    : buildThumbnailPrompt(course);

  const png = await generateImage(prompt, { feature: "thumbnail_course", userId });
  if (!png) return NextResponse.json({ error: "Image generation failed." }, { status: 502 });

  const key = `thumbnails/courses/${course.id}/${Date.now()}.png`;
  await putR2Object(key, Buffer.from(png), "image/png");
  const url = r2PublicUrl(key);

  await prisma.course.update({ where: { id }, data: { thumbnail: url } });
  trackServer({ userId, name: "thumbnail_generated", props: { type: "course", courseId: id } });

  return NextResponse.json({ url, prompt });
}
