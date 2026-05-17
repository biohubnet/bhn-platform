import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { chat, AI_CONFIGURED } from "@/lib/ai";
import {
  fetchHomepageHtml,
  pickBestLogoWithFallback,
} from "@/lib/employer/logo-discovery";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You research a company's website and produce structured profile JSON.

Return ONLY a JSON object with these keys (empty string / null when unknown):

{
  "companyName":         string,
  "companyIndustry":     string,   // e.g. "Cell & gene therapy", "Diagnostics"
  "companySize":         string,   // "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+"
  "companyLocation":     string,   // HQ city + region/country
  "companyDescription":  string,   // 2-4 sentences, plain prose, no marketing fluff. Always extract this when the homepage has an about/intro section.
  "companyFounded":      string,   // year, e.g. "2018", or "" if unknown
  "companyMainBusiness": string,   // one short line: main lines of business + flagship products, comma-separated. e.g. "Pharmaceuticals, crop science, consumer health — Aspirin, Yaz, Xarelto"
  "companyTicker":       string    // stock ticker WITH exchange prefix if public, e.g. "BAYN.DE", "NYSE:MRK", "NASDAQ:NVDA". Empty if private.
}

Rules:
- Output ONLY the JSON. No prose, no markdown fences.
- Don't invent facts. Leave a field empty rather than guess.
- companyDescription is required when the page has ANY about-section text — pick a 2-4 sentence excerpt rather than returning empty.`;

interface Body {
  website?: string;
  companyName?: string;  // optional hint when website is empty
}

interface Parsed {
  companyName: string;
  companyIndustry: string;
  companySize: string;
  companyLocation: string;
  companyDescription: string;
  companyFounded: string;
  companyMainBusiness: string;
  companyTicker: string;
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function extractText(html: string) {
  // Collect <title>, meta description / og:description, plus the
  // visible body text — capped at ~4 KB so the AI prompt stays sane.
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
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
  return [title && `Title: ${title}`, desc && `Description: ${desc}`, stripped]
    .filter(Boolean)
    .join("\n\n");
}

function extractJsonBlock(text: string): string {
  const fenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < fenced.length; i++) {
    const ch = fenced[i];
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) return fenced.slice(start, i + 1);
    }
  }
  return fenced;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!AI_CONFIGURED.chat) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const url = normalizeUrl(body.website ?? "");
  if (!url) {
    return NextResponse.json({ error: "Enter a valid company website." }, { status: 400 });
  }

  // Pull the homepage HTML via the shared fetcher (same UA + timeout
  // as the dedicated logo-search endpoint, so both paths see the same
  // page) and condense it to plaintext for the LLM prompt below.
  const rawHtml = await fetchHomepageHtml(url);
  const pageText = rawHtml ? extractText(rawHtml) : "";

  const aiInput = pageText
    ? `Website URL: ${url.toString()}\n\nPage content:\n${pageText}`
    : `Website URL: ${url.toString()}\n(No page content reachable. Use prior knowledge of this URL if any.)`;

  const result = await chat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: aiInput },
    ],
    { feature: "employer_profile_autofill", maxTokens: 800, temperature: 0.1 }
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "AI request failed." }, { status: 502 });
  }

  let parsed: Parsed;
  try {
    parsed = JSON.parse(extractJsonBlock(result.text)) as Parsed;
  } catch {
    return NextResponse.json(
      { error: "AI returned non-JSON. Try again or fill the fields manually." },
      { status: 502 }
    );
  }

  // Pick the highest-scored logo candidate from the homepage. Falls
  // through to Clearbit's 256-px+ hosted logo when the HTML has no
  // usable mark — preferred over Google's 128 px favicon because
  // favicons read as low-res chrome on the /employer disc.
  const logo = rawHtml
    ? pickBestLogoWithFallback(rawHtml, url)
    : pickBestLogoWithFallback("", url);

  return NextResponse.json({
    ok: true,
    profile: {
      companyName: String(parsed.companyName ?? "").trim(),
      companyIndustry: String(parsed.companyIndustry ?? "").trim(),
      companySize: String(parsed.companySize ?? "").trim(),
      companyLocation: String(parsed.companyLocation ?? "").trim(),
      companyDescription: String(parsed.companyDescription ?? "").trim(),
      companyFounded: String(parsed.companyFounded ?? "").trim(),
      companyMainBusiness: String(parsed.companyMainBusiness ?? "").trim(),
      companyTicker: String(parsed.companyTicker ?? "").trim(),
      companyLogo: logo,
      companyWebsite: url.toString(),
    },
  });
}
