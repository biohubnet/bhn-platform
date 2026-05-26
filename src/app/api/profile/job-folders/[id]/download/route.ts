/**
 * GET /api/profile/job-folders/[id]/download
 *
 * Bundles a job folder's four documents (JD · Resume · Cover letter ·
 * Interview prep) into a single Markdown file and returns it as a
 * file download. The role-play simulation is intentionally NOT
 * included — it's an interactive experience, not a document.
 *
 * Markdown was picked over PDF/zip because:
 *   • Zero new dependencies (no archiver / jszip / puppeteer).
 *   • Opens in any text editor, Marked, Obsidian, Notion, Google Docs,
 *     etc. The user can export to PDF from there if they want.
 *   • Plays nicely with the existing platform — cover letter and
 *     interview prep are already stored as markdown.
 *   • Resume rendering walks the structured ResumeContent JSON into
 *     readable markdown (headings, sub-headings, bullets).
 *
 * Filename: slugified folder title + ISO date, e.g.
 *   "msd-msl-oncology-folder-2026-05-26.md"
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ResumeContent, ResumeSection, ResumeItem } from "@/lib/resume/types";

export const runtime = "nodejs";

const SECTION_KIND_HEADINGS: Record<string, string> = {
  experience:     "Experience",
  education:      "Education",
  projects:       "Projects",
  skills:         "Skills",
  certifications: "Certifications",
  publications:   "Publications",
  awards:         "Awards",
  volunteering:   "Volunteering",
  summary:        "Summary",
  other:          "Other",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const folder = await prisma.jobFolder.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      jdSnippet: true,
      coverLetter: true,
      interviewPrep: true,
      notes: true,
      status: true,
      postingId: true,
      appliedAt: true,
      deadline: true,
      applicationUrl: true,
      recruiterName: true,
      recruiterEmail: true,
      referredBy: true,
      createdAt: true,
      updatedAt: true,
      resume: {
        select: {
          id: true,
          name: true,
          version: true,
          content: true,
          sourceFileUrl: true,
        },
      },
    },
  });
  if (!folder || folder.userId !== userId) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  // Posting is its own model (InternshipPosting) — no direct Prisma
  // relation from JobFolder, so the lookup is a second query when
  // there's something to look up.
  const posting = folder.postingId
    ? await prisma.internshipPosting.findUnique({
        where: { id: folder.postingId },
        select: { title: true, companyName: true },
      })
    : null;

  const md = buildFolderMarkdown({ ...folder, posting });
  const filename = slugifyFilename(folder.title) + "-" + isoDate(folder.updatedAt) + ".md";

  return new NextResponse(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// ── Builders ──────────────────────────────────────────────────────

function buildFolderMarkdown(folder: {
  title: string;
  jdSnippet: string;
  coverLetter: string;
  interviewPrep: string;
  notes: string;
  status: string;
  appliedAt: Date | null;
  deadline: Date | null;
  applicationUrl: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  referredBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  resume: {
    id: string;
    name: string;
    version: number;
    content: unknown;
    sourceFileUrl: string | null;
  } | null;
  posting: { title: string; companyName: string } | null;
}): string {
  const parts: string[] = [];

  // ── Header ─────────────────────────────────────────────────────
  parts.push(`# ${folder.title}\n`);
  parts.push("");
  parts.push(`> Status: **${folder.status}**`);
  parts.push(`> Last edited: ${folder.updatedAt.toLocaleString()}`);
  parts.push(`> Folder created: ${folder.createdAt.toLocaleString()}`);
  if (folder.appliedAt) {
    parts.push(`> Applied on: ${folder.appliedAt.toLocaleDateString()}`);
  }
  if (folder.deadline) {
    parts.push(`> Deadline: ${folder.deadline.toLocaleDateString()}`);
  }
  if (folder.applicationUrl) {
    parts.push(`> Application URL: ${folder.applicationUrl}`);
  }
  if (folder.recruiterName || folder.recruiterEmail) {
    const r = [folder.recruiterName, folder.recruiterEmail].filter(Boolean).join(" · ");
    parts.push(`> Recruiter: ${r}`);
  }
  if (folder.referredBy) {
    parts.push(`> Referred by: ${folder.referredBy}`);
  }
  if (folder.posting) {
    parts.push(`> Linked posting: ${folder.posting.title} @ ${folder.posting.companyName}`);
  }
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── 1. Job description ─────────────────────────────────────────
  parts.push("## 1. Job description");
  parts.push("");
  parts.push(folder.jdSnippet.trim() || "_(empty — no JD captured)_");
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── 2. Resume ─────────────────────────────────────────────────
  parts.push("## 2. Resume");
  parts.push("");
  if (!folder.resume) {
    parts.push("_(No resume linked to this folder.)_");
  } else {
    parts.push(
      `**${folder.resume.name}** (version ${folder.resume.version})`,
    );
    parts.push("");
    if (folder.resume.sourceFileUrl) {
      parts.push(`Source upload: ${folder.resume.sourceFileUrl}`);
      parts.push("");
    }
    parts.push(resumeContentToMarkdown(folder.resume.content));
  }
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── 3. Cover letter ───────────────────────────────────────────
  parts.push("## 3. Cover letter");
  parts.push("");
  parts.push(folder.coverLetter.trim() || "_(empty — no cover letter drafted)_");
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── 4. Interview prep ─────────────────────────────────────────
  parts.push("## 4. Interview prep");
  parts.push("");
  parts.push(folder.interviewPrep.trim() || "_(empty — no interview prep drafted)_");
  parts.push("");
  parts.push("---");
  parts.push("");

  // ── 5. Notes ──────────────────────────────────────────────────
  if (folder.notes.trim()) {
    parts.push("## 5. Notes");
    parts.push("");
    parts.push(folder.notes.trim());
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  parts.push(
    "_Generated from your BHN job folder. Role-play simulation data is intentionally not included — it's an interactive experience, not a document._",
  );

  return parts.join("\n");
}

/**
 * Walks the ResumeContent JSON into a readable markdown block. Best-
 * effort — falls back to a placeholder if the content doesn't match
 * the expected shape, so a malformed legacy row doesn't blow up the
 * download.
 */
function resumeContentToMarkdown(rawContent: unknown): string {
  if (!rawContent || typeof rawContent !== "object") {
    return "_(Resume content is empty or malformed.)_";
  }
  const content = rawContent as ResumeContent;
  if (!content.sections || !Array.isArray(content.sections) || content.sections.length === 0) {
    return "_(Resume has no structured sections yet.)_";
  }

  const lines: string[] = [];

  // Optional header block (name, email, phone, etc.) — render if any.
  if (content.header) {
    const h = content.header as Record<string, unknown>;
    const headerLines = [
      h.name && `**${String(h.name)}**`,
      h.email && String(h.email),
      h.phone && String(h.phone),
      h.location && String(h.location),
      h.website && String(h.website),
    ].filter(Boolean) as string[];
    if (headerLines.length > 0) {
      lines.push(headerLines.join(" · "));
      lines.push("");
    }
  }

  const sortedSections = [...content.sections].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  for (const section of sortedSections) {
    lines.push("### " + sectionHeading(section));
    lines.push("");
    if (!section.items || section.items.length === 0) {
      lines.push("_(no items)_");
      lines.push("");
      continue;
    }
    const sortedItems = [...section.items].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    for (const item of sortedItems) {
      renderItem(lines, item);
    }
  }

  return lines.join("\n").trim();
}

function sectionHeading(section: ResumeSection): string {
  if (section.title && section.title.trim()) return section.title.trim();
  return SECTION_KIND_HEADINGS[section.kind] ?? "Section";
}

function renderItem(lines: string[], item: ResumeItem): void {
  // Title line — bold + subtitle on same line for compactness.
  const titlePieces: string[] = [];
  if (item.title) titlePieces.push(`**${item.title}**`);
  if (item.subtitle) titlePieces.push(`*${item.subtitle}*`);
  if (titlePieces.length > 0) {
    lines.push("#### " + titlePieces.join(" — "));
  }

  // Dates + metric on a meta line.
  const meta: string[] = [];
  if (item.startDate || item.endDate || item.dateRange || item.current) {
    const start = item.startDate ?? "";
    const end = item.current ? "Present" : (item.endDate ?? "");
    const range = item.dateRange ?? (start || end ? `${start} – ${end}` : "");
    if (range.trim()) meta.push(range.trim());
  }
  if (item.metric) meta.push(item.metric);
  if (item.url) meta.push(item.url);
  if (meta.length > 0) {
    lines.push(meta.join("  ·  "));
  }

  if (item.description) {
    lines.push("");
    lines.push(item.description);
  }

  if (item.bullets && item.bullets.length > 0) {
    lines.push("");
    const sortedBullets = [...item.bullets].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    for (const b of sortedBullets) {
      if (b.body && b.body.trim()) {
        lines.push(`- ${b.body.trim()}`);
      }
    }
  }
  lines.push("");
}

// ── Utilities ─────────────────────────────────────────────────────

function slugifyFilename(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "job-folder";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
