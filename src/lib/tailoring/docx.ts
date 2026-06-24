/**
 * DOCX + plain-text serializers for the ATS output matrix (Phase 4).
 * ATS-safe: Arial, simple paragraphs (no tables / text boxes / glyphs
 * the parsers choke on), set margins, reverse-chronological as authored.
 */
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import type { ResumeContent, ResumeSectionKind } from "@/lib/resume/types";

type Header = ResumeContent["header"];

const FONT = "Arial";
const MARGIN = 1080; // 0.75" in twips

const SECTION_LABEL: Record<ResumeSectionKind, string> = {
  summary: "Summary", experience: "Experience", skills: "Skills",
  education: "Education", projects: "Projects", certifications: "Certifications",
  publications: "Publications", awards: "Awards", volunteering: "Volunteering", other: "Additional",
};

function headerParagraphs(header: Header): Paragraph[] {
  if (!header) return [];
  const out: Paragraph[] = [];
  if (header.name) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new TextRun({ text: header.name, font: FONT, bold: true, size: 30 })],
    }));
  }
  const contact = [header.email, header.phone, header.location].filter(Boolean).join("    ");
  if (contact) {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [new TextRun({ text: contact, font: FONT, size: 19 })],
    }));
  }
  if (header.summary) {
    out.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: header.summary, font: FONT, size: 21 })] }));
  }
  return out;
}

function bodyParagraphs(content: ResumeContent): Paragraph[] {
  const out: Paragraph[] = [];
  for (const s of content.sections) {
    const label = s.title || SECTION_LABEL[s.kind] || "Additional";
    out.push(new Paragraph({
      spacing: { before: 160, after: 60 }, border: { bottom: { color: "888888", size: 6, style: BorderStyle.SINGLE, space: 1 } },
      children: [new TextRun({ text: label.toUpperCase(), font: FONT, bold: true, size: 22 })],
    }));
    for (const it of s.items) {
      const head = [it.title, it.subtitle].filter(Boolean).join(", ");
      if (head || it.dateRange) {
        out.push(new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [
            new TextRun({ text: head, font: FONT, bold: true, size: 21 }),
            ...(it.dateRange ? [new TextRun({ text: `    ${it.dateRange}`, font: FONT, italics: true, size: 19 })] : []),
          ],
        }));
      }
      if (it.description) out.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: it.description, font: FONT, size: 21 })] }));
      for (const b of it.bullets) {
        out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [new TextRun({ text: b.body, font: FONT, size: 21 })] }));
      }
    }
  }
  return out;
}

async function pack(children: Paragraph[]): Promise<Buffer> {
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [{ properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children }],
  });
  return Packer.toBuffer(doc);
}

export async function resumeDocx(content: ResumeContent): Promise<Buffer> {
  return pack([...headerParagraphs(content.header), ...bodyParagraphs(content)]);
}

export async function coverDocx(coverText: string, header: Header): Promise<Buffer> {
  const paras = coverText.split(/\n{2,}/).map((p) =>
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: p.replace(/\n/g, " ").trim(), font: FONT, size: 22 })] }),
  );
  return pack([...headerParagraphs(header), ...paras]);
}

export async function combinedDocx(coverText: string, content: ResumeContent, order: ("cover" | "resume")[]): Promise<Buffer> {
  const cover = coverText.split(/\n{2,}/).map((p) =>
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: p.replace(/\n/g, " ").trim(), font: FONT, size: 22 })] }),
  );
  const resume = [...headerParagraphs(content.header), ...bodyParagraphs(content)];
  const blocks: Paragraph[] = [];
  for (const part of order) {
    if (part === "cover") { blocks.push(...headerParagraphs(content.header), ...cover); }
    else { blocks.push(new Paragraph({ children: [], pageBreakBefore: true }), ...resume); }
  }
  return pack(blocks);
}

/** Comma-separated skills list for Workday's type-ahead field. */
export function skillsTxt(content: ResumeContent): string {
  const skills: string[] = [];
  for (const s of content.sections) {
    if (s.kind !== "skills") continue;
    for (const it of s.items) {
      if (it.title) skills.push(it.title);
      for (const b of it.bullets) skills.push(...b.body.split(/[,;]/).map((x) => x.trim()).filter(Boolean));
    }
  }
  return [...new Set(skills)].join(", ");
}

/** Workday parse-optimized resume: plain text, no bullet glyphs, no
 *  punctuation except in emails, comma-separated skills. */
export function parseSafeResumeText(content: ResumeContent): string {
  const lines: string[] = [];
  const h = content.header;
  if (h?.name) lines.push(h.name);
  if (h?.email) lines.push(h.email);
  if (h?.phone) lines.push(h.phone.replace(/[^\d+ ]/g, ""));
  if (h?.location) lines.push(strip(h.location));
  lines.push("");
  for (const s of content.sections) {
    lines.push((s.title || SECTION_LABEL[s.kind] || "Additional").toUpperCase());
    if (s.kind === "skills") {
      lines.push(strip(skillsTxt(content)));
    } else {
      for (const it of s.items) {
        const head = [it.title, it.subtitle, it.dateRange].filter(Boolean).join(" ");
        if (head) lines.push(strip(head));
        for (const b of it.bullets) lines.push(strip(b.body));
      }
    }
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Remove punctuation that confuses ATS parsers (keep word chars, spaces, commas, +.#-). */
function strip(s: string): string {
  return s.replace(/[•·|–—]/g, " ").replace(/[^\w\s,+.#-]/g, "").replace(/\s+/g, " ").trim();
}
