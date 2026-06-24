/**
 * Coerce the AI Draft (loose shape) into the platform's canonical
 * ResumeContent tree (ids + positions + valid section kinds), plus
 * text helpers for the QA gate.
 */
import type { ResumeContent, ResumeSectionKind } from "@/lib/resume/types";
import type { Draft } from "./schemas";

const KINDS: ResumeSectionKind[] = [
  "summary", "experience", "skills", "education", "projects",
  "certifications", "publications", "awards", "volunteering", "other",
];
function coerceKind(k: string): ResumeSectionKind {
  const v = k.trim().toLowerCase() as ResumeSectionKind;
  return KINDS.includes(v) ? v : "other";
}

let counter = 0;
const id = (p: string) => `${p}_${(counter++).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function draftToResumeContent(draft: Draft): ResumeContent {
  return {
    header: draft.header,
    sections: (draft.sections ?? []).map((s, si) => ({
      id: id("sec"),
      kind: coerceKind(s.kind),
      position: si,
      title: s.title,
      items: (s.items ?? []).map((it, ii) => ({
        id: id("item"),
        position: ii,
        title: it.title,
        subtitle: it.subtitle,
        dateRange: it.dateRange,
        bullets: (it.bullets ?? []).filter((b) => b.trim()).map((b, bi) => ({
          id: id("b"),
          position: bi,
          body: b.trim(),
        })),
      })),
    })),
  };
}

/** All resume body text (no cover) — for page/voice checks on the resume alone. */
export function resumeText(content: ResumeContent): string {
  const parts: string[] = [];
  for (const s of content.sections) {
    if (s.title) parts.push(s.title);
    for (const it of s.items) {
      parts.push([it.title, it.subtitle, it.dateRange].filter(Boolean).join(" "));
      if (it.description) parts.push(it.description);
      for (const b of it.bullets) parts.push(b.body);
    }
  }
  return parts.join("\n");
}
