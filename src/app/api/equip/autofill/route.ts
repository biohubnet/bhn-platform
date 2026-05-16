/**
 * POST /api/equip/autofill
 *
 * Takes a URL pointing at a lab page, publication, accelerator
 * profile, or startup landing site. Fetches the page, condenses
 * to plaintext, asks Claude/Gemini to extract:
 *
 *   • innovationSummary       (200-word paragraph)
 *   • keyResearchAreas        (3-5 short tags)
 *   • institutionName         (if mentioned)
 *   • principalInvestigator   (if mentioned)
 *   • suggestedSuccessCriteria (one-line)
 *
 * Returns the structured blob. The client merges what it likes
 * back into the VentureLift form (the applicant always sees a
 * preview before any field is touched).
 *
 * Marks the application aiAssisted = true via the standard PATCH
 * flow so reviewers can see when AI was in the loop.
 *
 * Auth: any logged-in user can call this (it's their draft).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { AI_CONFIGURED, chat } from "@/lib/ai";
import { fetchHomepageHtml } from "@/lib/employer/logo-discovery";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You read a single web page (a lab page, publication, accelerator profile, or startup landing site) and extract structured fields that will pre-fill a VentureLift funding application for a biotech / biomanufacturing trainee-entrepreneur.

Return ONLY a single JSON object with these keys:
  • innovationSummary       — 180-220 word paragraph in the applicant's voice. First-person plural ("we"). Lead with the problem + the approach, then traction + plausibility. No marketing puffery; reads like a researcher writing a one-pager.
  • keyResearchAreas        — array of 3-5 short tags (≤ 4 words each).
  • institutionName         — string or null. The most-specific affiliation visible on the page.
  • principalInvestigator   — string or null. PI / lead researcher name, if visible.
  • suggestedSuccessCriteria — one short sentence describing what a 6-month win looks like, given what you read.

If the page is uninformative or unrelated to biotech, return innovationSummary as a polite single sentence saying you couldn't extract enough; leave the rest null/empty.

CRITICAL: Output the JSON object only — no prose, no fences, no preamble.`;

interface AiResult {
  innovationSummary?: string;
  keyResearchAreas?: string[];
  institutionName?: string | null;
  principalInvestigator?: string | null;
  suggestedSuccessCriteria?: string | null;
}

function normalizeUrl(raw: string): URL | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u;
  } catch {
    return null;
  }
}

function extractText(html: string): string {
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const desc =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ??
    "";
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  return [title && `Title: ${title}`, desc && `Description: ${desc}`, stripped]
    .filter(Boolean)
    .join("\n\n");
}

function extractJsonBlock(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0 && start >= 0) return stripped.slice(start, i + 1); }
  }
  return stripped;
}

export async function POST(req: Request) {
  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!AI_CONFIGURED.chat) {
    return NextResponse.json({ error: "AI auto-fill is not configured on this deployment." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({} as { url?: string }));
  const url = normalizeUrl(body.url ?? "");
  if (!url) {
    return NextResponse.json({ error: "Provide a valid http(s) URL." }, { status: 400 });
  }

  const rawHtml = await fetchHomepageHtml(url);
  const pageText = rawHtml ? extractText(rawHtml) : "";

  if (!pageText) {
    return NextResponse.json(
      { error: "Couldn't reach that URL. Try a public mirror or paste the description manually." },
      { status: 502 },
    );
  }

  const aiResp = await chat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Source URL: ${url.toString()}\n\nPage content:\n${pageText}` },
    ],
    { feature: "equip_autofill", userId, maxTokens: 1200, temperature: 0.2 },
  );
  if (!aiResp.ok) {
    return NextResponse.json({ error: aiResp.error ?? "AI request failed" }, { status: 502 });
  }

  let parsed: AiResult;
  try {
    parsed = JSON.parse(extractJsonBlock(aiResp.text)) as AiResult;
  } catch {
    return NextResponse.json(
      { error: "AI returned non-JSON; try again or fill the fields manually." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    result: {
      innovationSummary: typeof parsed.innovationSummary === "string" ? parsed.innovationSummary.trim() : null,
      keyResearchAreas: Array.isArray(parsed.keyResearchAreas)
        ? parsed.keyResearchAreas.filter((t) => typeof t === "string").slice(0, 5)
        : [],
      institutionName: typeof parsed.institutionName === "string" ? parsed.institutionName.trim() : null,
      principalInvestigator: typeof parsed.principalInvestigator === "string" ? parsed.principalInvestigator.trim() : null,
      suggestedSuccessCriteria: typeof parsed.suggestedSuccessCriteria === "string"
        ? parsed.suggestedSuccessCriteria.trim()
        : null,
    },
  });
}
