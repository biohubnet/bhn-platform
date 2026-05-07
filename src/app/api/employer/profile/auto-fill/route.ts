import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { chat, AI_CONFIGURED } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You research a company's website and produce structured profile JSON.

Return ONLY a JSON object with these keys (empty string / null when unknown):

{
  "companyName":        string,
  "companyIndustry":    string,   // e.g. "Cell & gene therapy", "Diagnostics"
  "companySize":        string,   // "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+"
  "companyLocation":    string,   // HQ city + region/country
  "companyDescription": string,   // 2-4 sentences, plain prose, no marketing fluff
  "companyFounded":     string    // year, e.g. "2018", or "" if unknown
}

Rules:
- Output ONLY the JSON. No prose, no markdown fences.
- Don't invent facts. Leave a field empty rather than guess.`;

const HEADERS = {
  // Pretend to be a normal browser so corporate sites don't block us.
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

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

  // Pull the homepage HTML and condense it to plaintext.
  let pageText = "";
  try {
    const fetchRes = await fetch(url.toString(), {
      headers: HEADERS,
      // Give corporate sites a generous-ish timeout via signal.
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (fetchRes.ok) {
      const html = await fetchRes.text();
      pageText = extractText(html);
    }
  } catch {
    // Fall through — we'll let the AI work from the URL alone.
  }

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

  // Logo = Google's favicon service. Free, public, returns a 128px PNG
  // for any registered domain.
  const logo = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;

  return NextResponse.json({
    ok: true,
    profile: {
      companyName: String(parsed.companyName ?? "").trim(),
      companyIndustry: String(parsed.companyIndustry ?? "").trim(),
      companySize: String(parsed.companySize ?? "").trim(),
      companyLocation: String(parsed.companyLocation ?? "").trim(),
      companyDescription: String(parsed.companyDescription ?? "").trim(),
      companyFounded: String(parsed.companyFounded ?? "").trim(),
      companyLogo: logo,
      companyWebsite: url.toString(),
    },
  });
}
