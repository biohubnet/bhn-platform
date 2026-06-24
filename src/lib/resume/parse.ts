/**
 * AI parse — uploaded resume → structured ResumeContent tree.
 *
 * One-shot extraction call via the platform's `chat()` adapter
 * (Gemini Flash primary, Cloudflare Llama 3.3 fallback). The prompt
 * asks for strict JSON; the parser tolerates ```json fences (some
 * providers wrap in markdown) and missing trailing commas.
 *
 * The trainee always retains edit authority, so parse imperfections
 * are not a correctness issue — they're just a starting point the
 * user can fix inline.
 */
import { chat } from "@/lib/ai";
import {
  type ResumeContent, type ResumeSectionKind,
  emptyResumeContent, rid,
} from "./types";

const PARSE_SYSTEM = `You are a resume parser. Read a resume's plain text and return a structured JSON representation.

OUTPUT STRICTLY this shape:
{
  "header": {
    "name": "...",     // optional
    "email": "...",    // optional
    "phone": "...",    // optional
    "location": "...", // optional
    "summary": "..."   // optional — the professional-summary paragraph if present
  },
  "sections": [
    {
      "kind": "summary" | "experience" | "skills" | "education" | "projects" | "certifications" | "publications" | "conferences" | "awards" | "volunteering" | "other",
      "title": "...",   // optional — only if the heading differs from the standard label
      "items": [
        {
          "title": "...",       // job title / degree / project / cert name / paper title
          "subtitle": "...",    // company+location / institution / role+stack / issuer / authors / venue
          "startDate": "...",   // "May 2025" — free text, preserve what's printed
          "endDate": "...",     // "Aug 2025" — omit OR set to "" when current=true
          "current": true,      // true if "Present" / "Current" / "Now" appears, false otherwise
          "dateRange": "...",   // OPTIONAL fallback — only if you can't split into start/end
          "metric": "...",      // GPA for education, credential id for certs, ranking for awards, venue for publications
          "url": "...",         // project URL / cert verify link / DOI / paper link
          "description": "...", // one short intro sentence ABOVE the bullets (esp. for summary + experience + projects)
          "bullets": [
            "First bullet point.",
            "Second bullet point."
          ]
        }
      ]
    }
  ]
}

Rules:
- Use the most specific 'kind' that fits each heading. Map "Work Experience" / "Professional Experience" / "Employment" to "experience". Map "Technical Skills" / "Core Competencies" / "Skills" to "skills". Map "Selected Projects" / "Side Projects" to "projects". Anything unclear → "other".
- ALWAYS try to split a date range into "startDate" + "endDate" + "current". Only fall back to "dateRange" if the source text really doesn't separate them (rare).
- For SKILLS sections, group every comma-separated list as ONE item with bullets — one bullet per skill keyword. No title/subtitle/dates needed for the item.
- For SUMMARY / OBJECTIVE sections, ONE item with the full paragraph in "description" — leave "bullets" empty.
- For EDUCATION, put GPA / honours / classification into "metric" (e.g. "GPA 3.82 / 4.0"). Coursework / honours / thesis title → bullets.
- For CERTIFICATIONS, "metric" is the credential id if present; "url" is the verify link. No bullets.
- For PUBLICATIONS, "subtitle" is the author list, "metric" is the venue / journal, "url" is the DOI or paper link, "description" is an optional one-sentence summary. No bullets.
- For CONFERENCES (talks, posters, panels presented), "title" is the talk/poster title, "subtitle" is the conference + location, "metric" is the format (talk / poster / panel), "url" is a link if present. No bullets.
- For AWARDS, "metric" is the placement / ranking if relevant.
- Preserve the order sections + items appear in the source text.
- Don't invent content. If a field is absent in the source, omit it (don't fabricate dates or URLs).
- Return JSON only. No prose, no commentary, no markdown fences.`;

export async function parseResumeText(
  resumeText: string,
  opts: { userId?: string | null } = {},
): Promise<ResumeContent> {
  // Defensive cap on input size so a malformed PDF can't blow the
  // context window. 12K chars covers ~5 pages of dense text.
  const truncated = resumeText.length > 12000 ? resumeText.slice(0, 12000) : resumeText;

  const result = await chat([
    { role: "system", content: PARSE_SYSTEM },
    { role: "user",   content: truncated },
  ], { userId: opts.userId, feature: "resume_parse", maxTokens: 4096 });

  if (!result.ok || !result.text) {
    // Provider failed — return an empty scaffold so the user can
    // build the resume from scratch. Comments on Resume.content
    // already document this fall-through.
    return emptyResumeContent();
  }

  const parsed = extractJson(result.text);
  if (!parsed) return emptyResumeContent();

  return normaliseParsed(parsed);
}

/** Tolerant JSON extractor — strips ```json``` fences and trims to the
 *  outermost { … } so trailing prose doesn't break JSON.parse(). */
function extractJson(raw: string): unknown | null {
  let body = raw.trim();
  // strip ``` fences
  body = body.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  // grab the outermost JSON object
  const first = body.indexOf("{");
  const last  = body.lastIndexOf("}");
  if (first < 0 || last < 0 || last < first) return null;
  body = body.slice(first, last + 1);
  try { return JSON.parse(body); } catch { return null; }
}

/** Take whatever shape the LLM returned and coerce it into a strict
 *  ResumeContent. Missing fields default to undefined; unknown
 *  section kinds collapse to "other"; every node gets a stable id. */
function normaliseParsed(raw: unknown): ResumeContent {
  if (!raw || typeof raw !== "object") return emptyResumeContent();
  const obj = raw as Record<string, unknown>;

  const header = obj.header && typeof obj.header === "object"
    ? coerceHeader(obj.header as Record<string, unknown>)
    : undefined;

  const sectionsRaw = Array.isArray(obj.sections) ? obj.sections : [];
  const sections = sectionsRaw.map((s, sIdx) => {
    const sObj = (s ?? {}) as Record<string, unknown>;
    const kind = coerceKind(sObj.kind);
    const itemsRaw = Array.isArray(sObj.items) ? sObj.items : [];
    return {
      id: rid(),
      kind,
      position: sIdx,
      title: typeof sObj.title === "string" ? sObj.title.trim() || undefined : undefined,
      items: itemsRaw.map((it, iIdx) => {
        const iObj = (it ?? {}) as Record<string, unknown>;
        const bulletsRaw = Array.isArray(iObj.bullets) ? iObj.bullets : [];
        const str = (k: string) =>
          typeof iObj[k] === "string" ? (iObj[k] as string).trim() || undefined : undefined;
        return {
          id: rid(),
          position: iIdx,
          title:       str("title"),
          subtitle:    str("subtitle"),
          startDate:   str("startDate"),
          endDate:     str("endDate"),
          // Coerce truthy → true so "true" / true / 1 all work.
          current:     iObj.current === true || iObj.current === "true",
          metric:      str("metric"),
          url:         str("url"),
          description: str("description"),
          dateRange:   str("dateRange"),
          bullets: bulletsRaw
            .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
            .map((body, bIdx) => ({
              id: rid(),
              position: bIdx,
              body: body.trim(),
              aiSuggested: false,
            })),
        };
      }),
    };
  });

  return { header, sections };
}

function coerceHeader(h: Record<string, unknown>) {
  const get = (k: string) => typeof h[k] === "string" ? (h[k] as string).trim() || undefined : undefined;
  return {
    name:     get("name"),
    email:    get("email"),
    phone:    get("phone"),
    location: get("location"),
    summary:  get("summary"),
  };
}

function coerceKind(v: unknown): ResumeSectionKind {
  const valid: ResumeSectionKind[] = [
    "summary", "experience", "skills", "education", "projects",
    "certifications", "publications", "conferences", "awards", "volunteering", "other",
  ];
  if (typeof v === "string" && (valid as string[]).includes(v)) return v as ResumeSectionKind;
  return "other";
}
