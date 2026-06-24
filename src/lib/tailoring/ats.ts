/**
 * ATS detection (from the posting URL host) + the output matrix.
 * The matrix drives which files the export endpoint produces. A
 * posting's explicit "upload one PDF with CV + cover" instruction
 * always overrides the default (handled by the caller passing an
 * override).
 */
import type { AtsKind } from "./schemas";

const HOST_MAP: { test: RegExp; ats: AtsKind }[] = [
  { test: /myworkdayjobs\.com|workday/i, ats: "workday" },
  { test: /boards\.greenhouse\.io|greenhouse\.io|grnh\.se/i, ats: "greenhouse" },
  { test: /jobs\.lever\.co|lever\.co/i, ats: "lever" },
  { test: /jobs\.ashbyhq\.com|ashbyhq\.com/i, ats: "ashby" },
  { test: /successfactors|sapsf\.com|jobs\.sap\.com/i, ats: "successfactors" },
];

export function detectAts(url: string | null | undefined): AtsKind {
  if (!url) return "other";
  for (const { test, ats } of HOST_MAP) if (test.test(url)) return ats;
  return "other";
}

export interface AtsOutput {
  id: string;
  label: string;
  kind: "resume" | "cover" | "skills" | "combined";
  /** Workday's parse-optimized resume is plain text; everything else is .docx. */
  fmt: "docx" | "txt";
  /** Workday wants a punctuation-stripped, glyph-free resume for the parser. */
  parseSafe?: boolean;
  /** Combined doc order (cover first vs resume first). */
  order?: ("cover" | "resume")[];
}

export interface AtsPlan {
  ats: AtsKind;
  label: string;
  note: string;
  outputs: AtsOutput[];
}

const RESUME_DOCX: AtsOutput = { id: "resume", label: "Resume (.docx)", kind: "resume", fmt: "docx" };
const COVER_DOCX: AtsOutput = { id: "cover", label: "Cover letter (.docx)", kind: "cover", fmt: "docx" };

export function atsPlan(ats: AtsKind): AtsPlan {
  switch (ats) {
    case "workday":
      return {
        ats, label: "Workday",
        note: "Two resume versions: a human .docx and a parse-optimized .txt (no glyphs, no punctuation, comma-separated skills), plus a skills .txt for the type-ahead field.",
        outputs: [
          RESUME_DOCX,
          { id: "resume-parse", label: "Resume — parse-optimized (.txt)", kind: "resume", fmt: "txt", parseSafe: true },
          { id: "skills", label: "Skills list (.txt)", kind: "skills", fmt: "txt" },
          COVER_DOCX,
        ],
      };
    case "greenhouse":
    case "lever":
      return {
        ats, label: ats === "greenhouse" ? "Greenhouse" : "Lever",
        note: "Separate Resume .docx and Cover .docx.",
        outputs: [RESUME_DOCX, COVER_DOCX],
      };
    case "ashby":
      return {
        ats, label: "Ashby",
        note: "One combined document — cover first, then resume — plus a separate resume .docx backup. (Ramp is an exception that wants separate files; switch the format if the posting says so.)",
        outputs: [
          { id: "combined", label: "Combined — cover + resume (.docx)", kind: "combined", fmt: "docx", order: ["cover", "resume"] },
          RESUME_DOCX,
        ],
      };
    case "successfactors":
      return {
        ats, label: "SuccessFactors",
        note: "One combined document — cover first, then resume — plus a separate resume .docx backup.",
        outputs: [
          { id: "combined", label: "Combined — cover + resume (.docx)", kind: "combined", fmt: "docx", order: ["cover", "resume"] },
          RESUME_DOCX,
        ],
      };
    default:
      return {
        ats: "other", label: "Standard",
        note: "Separate Resume .docx and Cover .docx — the safe default when the ATS is unknown.",
        outputs: [RESUME_DOCX, COVER_DOCX],
      };
  }
}
