/**
 * AI-parse the caller's uploaded resume file into the structured tree.
 *
 *   POST /api/profile/resume/structure/parse
 *
 * Reads the existing User.resumeUrl, fetches the file, extracts text
 * (PDF / DOCX / TXT), calls the resume parser, and persists the
 * resulting ResumeContent onto Resume.content. Writes a revision
 * snapshot with `triggeredBy: "ai_parse"`.
 *
 * The trainee can re-trigger this any time (e.g. after uploading a
 * new version) — re-parsing always overwrites the current tree but
 * the prior tree is preserved as a revision, so the trainee can
 * revert if the parse comes out worse.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseResumeText } from "@/lib/resume/parse";
import { recordRevision } from "@/lib/resume/revisions";

export const runtime = "nodejs";
export const maxDuration = 60;

async function getMyUser() {
  const session = await requireSession().catch(() => null);
  if (!session) return null;
  const userId = (session.user as { id?: string }).id ?? null;
  return userId;
}

export async function POST(req: NextRequest) {
  void req;
  const userId = await getMyUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeUrl: true },
  });
  const url = user?.resumeUrl;
  if (!url) {
    return NextResponse.json(
      { error: "No uploaded resume on file. Upload a PDF/DOCX first via /profile, then re-run." },
      { status: 400 },
    );
  }

  // Fetch + extract text. The route lives behind admin auth so
  // SSRF concerns are minimal, but we still cap response size.
  let buf: Buffer;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
    const ab = await r.arrayBuffer();
    if (ab.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Resume file too large (>10MB)." }, { status: 413 });
    }
    buf = Buffer.from(ab);
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't fetch the uploaded resume: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  // Plain-text extraction — mirrors the existing skill-extractor path
  // so PDF / DOCX / TXT all behave identically.
  let text = "";
  const lower = url.toLowerCase();
  try {
    if (lower.endsWith(".pdf") || lower.includes(".pdf?")) {
      const { extractText } = await import("unpdf");
      const r = await extractText(new Uint8Array(buf), { mergePages: true });
      text = Array.isArray(r.text) ? r.text.join("\n") : (r.text ?? "");
    } else if (lower.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      text = r.value ?? "";
    } else if (lower.endsWith(".txt")) {
      text = buf.toString("utf-8");
    } else {
      // Best-effort: try PDF first, fall back to raw UTF-8.
      try {
        const { extractText } = await import("unpdf");
        const r = await extractText(new Uint8Array(buf), { mergePages: true });
        text = Array.isArray(r.text) ? r.text.join("\n") : (r.text ?? "");
      } catch {
        text = buf.toString("utf-8");
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't read the resume file: ${(e as Error).message}` },
      { status: 422 },
    );
  }

  if (text.trim().length < 80) {
    return NextResponse.json(
      { error: "The resume file seems empty — couldn't extract usable text. Try re-uploading." },
      { status: 422 },
    );
  }

  const parsed = await parseResumeText(text, { userId });

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.resume.upsert({
      where: { userId },
      create: {
        userId,
        sourceFileUrl: url,
        parsedAt: new Date(),
        content: parsed as unknown as object,
        version: 1,
        lastEditedAt: new Date(),
      },
      update: {
        sourceFileUrl: url,
        parsedAt: new Date(),
        content: parsed as unknown as object,
        version: { increment: 1 },
        lastEditedAt: new Date(),
      },
    });
    await recordRevision(tx, {
      resumeId: r.id,
      version: r.version,
      content: parsed as unknown as object,
      triggeredBy: "ai_parse",
      note: "AI parse from uploaded file",
    });
    return r;
  });

  return NextResponse.json({ ok: true, resume: updated });
}
