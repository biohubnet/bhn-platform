/**
 * Newsletter workshop — the AI half.
 *
 * One job: take whatever a colleague pasted in (a paragraph, a bullet
 * dump, a forwarded email) and decide the *shape* it should take in the
 * newsletter — headline, subhead, prose, an "At a Glance" card, a list of
 * named people, a CTA. The deterministic renderer in ./render.ts turns
 * that shape into email-safe markup.
 *
 * The hard rule in the prompt is no invention: dates, names, deadlines and
 * links must come from the submission. A newsletter that invents a
 * deadline is worse than one that omits it.
 */
import { z } from "zod";
import { type ChatMessage } from "@/lib/ai";
import { callStructured } from "@/lib/ai/reliability";
import { SECTION_THEME } from "./types";
import type { Section, PieceLayout } from "./types";

/** Lenient — we normalise every field ourselves below. */
const LayoutSchema = z
  .object({
    headline: z.string().optional(),
    subhead: z.string().nullable().optional(),
    body: z.array(z.string()).optional(),
    glance: z
      .array(
        z.object({
          label: z.string().optional(),
          value: z.string().optional(),
          accent: z.boolean().optional(),
        }).passthrough(),
      )
      .optional(),
    peopleLabel: z.string().nullable().optional(),
    people: z
      .array(
        z.object({
          name: z.string().optional(),
          detail: z.string().nullable().optional(),
          org: z.string().nullable().optional(),
        }).passthrough(),
      )
      .optional(),
    note: z.string().nullable().optional(),
    noteBadge: z.string().nullable().optional(),
    ctaLabel: z.string().nullable().optional(),
    ctaUrl: z.string().nullable().optional(),
  })
  .passthrough();

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const orNull = (v: unknown): string | undefined => {
  const s = str(v);
  return s.length > 0 ? s : undefined;
};

export interface NormaliseInput {
  section: Section;
  rawBody: string;
  sourceUrl?: string | null;
  /** Headline hint — the issue's other pieces, so the model can avoid
   *  repeating a headline already used this issue. */
  siblingHeadlines?: string[];
}

/**
 * Turn one raw submission into a PieceLayout. Falls back to a plain
 * prose block (never an empty piece) when the model is unreachable —
 * a contribution must never be silently dropped from an issue.
 */
export async function normalisePiece(
  input: NormaliseInput,
  userId: string | null,
): Promise<PieceLayout> {
  const theme = SECTION_THEME[input.section];

  const SYSTEM: ChatMessage = {
    role: "system",
    content: [
      "You lay out a monthly biotech-training newsletter. You receive one colleague's raw submission and decide how it should be presented.",
      "Output JSON only. Schema:",
      '{ "headline": "...", "subhead": "..."|null, "body": ["para", ...], "glance": [{"label":"DATES","value":"...","accent":false}]|null, "peopleLabel": "..."|null, "people": [{"name":"...","detail":"...","org":"..."}]|null, "note": "..."|null, "noteBadge": "..."|null, "ctaLabel": "..."|null, "ctaUrl": "..."|null }',
      "",
      "Choosing the shape:",
      "- 'glance' — ONLY when the submission states concrete logistics. Labels are short and uppercase: DATES, LOCATION, FORMAT, COMMITMENT, APPLY BY. Set accent:true on a deadline row so it renders in alert red.",
      "- 'people' — when the submission names individuals (awardees, matches, new hires). 'detail' is their programme or institution; 'org' is the employer / host lab. 'peopleLabel' groups them, e.g. 'Long-Term Placement · 4 to 6 Months'.",
      "- 'note' — a short forward-looking aside ('Round 5 opens in mid-July'). 'noteBadge' is a 1-2 word chip like 'Coming Soon'.",
      "- 'body' — everything else, as 1-3 tight paragraphs. Keep the contributor's facts and tone; tighten wording only.",
      "Use only the parts that fit. Most pieces need just headline + body.",
      "",
      "Hard rules:",
      "- NEVER invent dates, deadlines, names, numbers, institutions or URLs. If the submission doesn't state it, leave the field out.",
      "- Do not write a CTA unless a URL was supplied. ctaLabel is 2-4 words ('Learn More', 'Apply Now', 'Hire an Intern').",
      "- Headline is a noun phrase under 60 characters, not a sentence.",
      "- Plain text only — no HTML, no markdown, no emoji.",
    ].join("\n"),
  };

  const USER: ChatMessage = {
    role: "user",
    content: [
      `## Section: ${theme.label} (${theme.tagline})`,
      input.siblingHeadlines?.length
        ? `## Headlines already used this issue (don't repeat)\n${input.siblingHeadlines.map((h) => `- ${h}`).join("\n")}`
        : "",
      input.sourceUrl ? `## Link supplied by the contributor\n${input.sourceUrl}` : "## No link supplied — omit the CTA.",
      "",
      "## Raw submission",
      input.rawBody,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const r = await callStructured([SYSTEM, USER], LayoutSchema, {
    userId,
    feature: "newsletter.normalise",
    maxTokens: 1400,
    temperature: 0.25,
  });

  if (!r.ok) return fallbackLayout(input);

  const d = r.data;
  const body = (Array.isArray(d.body) ? d.body : []).map(str).filter(Boolean);
  const layout: PieceLayout = {
    headline: str(d.headline) || firstLine(input.rawBody),
    subhead: orNull(d.subhead),
    body: body.length > 0 ? body : [input.rawBody.trim()],
    glance: (d.glance ?? [])
      .map((g) => ({ label: str(g.label), value: str(g.value), accent: g.accent === true }))
      .filter((g) => g.label && g.value),
    people: (d.people ?? [])
      .map((p) => ({ name: str(p.name), detail: orNull(p.detail), org: orNull(p.org) }))
      .filter((p) => p.name),
    peopleLabel: orNull(d.peopleLabel),
    note: orNull(d.note),
    noteBadge: orNull(d.noteBadge),
    ctaLabel: orNull(d.ctaLabel),
    // The CTA can only ever point at the contributor's own link — the
    // model is never trusted to supply a URL.
    ctaUrl: input.sourceUrl ?? undefined,
  };
  if (!layout.ctaUrl) { layout.ctaLabel = undefined; }
  if (layout.glance?.length === 0) delete layout.glance;
  if (layout.people?.length === 0) delete layout.people;
  return layout;
}

function firstLine(raw: string): string {
  const l = raw.trim().split(/\r?\n/)[0] ?? "Untitled";
  return l.length > 70 ? `${l.slice(0, 67)}…` : l;
}

/** Model unreachable → publish the submission verbatim rather than
 *  dropping it. The editor can re-run normalisation later. */
function fallbackLayout(input: NormaliseInput): PieceLayout {
  const lines = input.rawBody.trim().split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return {
    headline: firstLine(input.rawBody),
    body: lines.length > 1 ? lines.slice(1) : lines,
    ctaLabel: input.sourceUrl ? "Learn More" : undefined,
    ctaUrl: input.sourceUrl ?? undefined,
  };
}
