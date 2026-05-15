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

/**
 * Best-effort logo discovery from the company homepage HTML.
 *
 * Walks every signal a brand-aware homepage typically exposes,
 * scores each candidate, and returns the winner — or null if
 * nothing usable was found. The fallback to Google's favicons
 * service stays in the caller (so a 16-px globe is never the
 * "primary" result, just the last resort).
 *
 * Scoring rationale (higher = better):
 *   • og:logo               100   — explicit, designed-for-this
 *   • Apple touch icon      60+   — 180px branded icon for iOS
 *                                  springboard; almost always the
 *                                  cleanest single-square mark
 *   • mask-icon (Safari)    55    — SVG, monochrome, but always
 *                                  cropped to the brand glyph
 *   • og:image              50    — social card; sometimes the
 *                                  logo, sometimes a hero image
 *   • <link rel="icon"               sized PWA icons (≥96 px) —
 *      sizes="192x192">     30+   useful when no apple-touch-icon
 *   • <img class="logo">    35    — header logo from the page
 *                                  itself; usually but not always
 *                                  the wordmark
 *   • SVG bonus            +10    — vector beats raster for any
 *                                  display density
 */
function discoverLogoFromHtml(html: string, pageUrl: URL): string | null {
  const candidates: { url: string; score: number; label: string }[] = [];
  const resolve = (href: string) => {
    try { return new URL(href, pageUrl).toString(); }
    catch { return null; }
  };
  const push = (href: string | undefined | null, score: number, label: string) => {
    if (!href) return;
    const abs = resolve(href);
    if (!abs) return;
    // Drop obvious tracking pixels and tiny placeholders.
    if (/1x1|spacer|pixel|blank/i.test(abs)) return;
    candidates.push({ url: abs, score, label });
  };

  // og:logo — rare, but most authoritative when present.
  const ogLogo =
    /<meta[^>]+property=["']og:logo["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  push(ogLogo, 100, "og:logo");

  // mask-icon (Safari pinned-tab SVG)
  const maskIcon =
    /<link[^>]+rel=["']mask-icon["'][^>]+href=["']([^"']+)["']/i.exec(html)?.[1]
    ?? /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']mask-icon["']/i.exec(html)?.[1];
  push(maskIcon, 55, "mask-icon");

  // apple-touch-icon — possibly multiple sized variants; prefer larger.
  for (const m of html.matchAll(/<link\b[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*>/gi)) {
    const tag = m[0];
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    const sizes = /sizes=["']([^"']+)["']/i.exec(tag)?.[1];
    const sizeNum = sizes ? parseInt(sizes.split("x")[0], 10) || 0 : 180;
    // 180px (default Apple touch icon) is fine; bigger is better.
    push(href, 60 + Math.min(Math.max(sizeNum, 0) / 6, 30), `apple-touch-icon ${sizes ?? "(default 180)"}`);
  }

  // Sized PWA icons — only count ≥96 px (anything smaller is likely
  // a true favicon, which we already deprioritise).
  for (const m of html.matchAll(/<link\b[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gi)) {
    const tag = m[0];
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    const sizes = /sizes=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href || !sizes || sizes === "any") continue;
    const sizeNum = parseInt(sizes.split("x")[0], 10) || 0;
    if (sizeNum < 96) continue;
    push(href, 30 + Math.min(sizeNum / 10, 30), `rel=icon ${sizes}`);
  }

  // og:image — usually a social card, sometimes the brand mark.
  const ogImage =
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  push(ogImage, 50, "og:image");

  // Twitter image — similar to og:image.
  const twImage =
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  push(twImage, 45, "twitter:image");

  // <img> tags whose class / id / alt screams "logo". Scan the head
  // and the first ~10 KB of the body (headers / brand bars live near
  // the top of the page).
  const headBody = html.slice(0, 12_000);
  for (const m of headBody.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/(?:class|alt|id)=["'][^"']*logo[^"']*["']/i.test(tag)) continue;
    const src =
      /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1]
      ?? /\bdata-src=["']([^"']+)["']/i.exec(tag)?.[1];
    push(src, 35, "<img class=logo>");
  }

  // JSON-LD Organization.logo (schema.org) — many corporate sites
  // carry this. Parse every <script type="application/ld+json"> and
  // walk for `logo`/`image` strings; keep it light, no recursion.
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const blob = JSON.parse(m[1].trim());
      const blobs = Array.isArray(blob) ? blob : [blob];
      for (const b of blobs) {
        if (b && typeof b === "object") {
          const t = (b as Record<string, unknown>);
          const logo = typeof t.logo === "string"
            ? t.logo
            : (t.logo && typeof t.logo === "object" && (t.logo as Record<string, unknown>).url) as string | undefined;
          if (logo) push(logo, 90, "json-ld Organization.logo");
        }
      }
    } catch { /* ignore */ }
  }

  // SVG bonus — vector scales cleanly to any disc size in our UI.
  for (const c of candidates) {
    if (/\.svg(?:\?|#|$)/i.test(c.url)) c.score += 10;
    // Tiny PNGs (e.g., ?width=32) are often favicons in disguise — dock.
    if (/(?:width|w|size)=(?:16|24|32)\b/i.test(c.url)) c.score -= 25;
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
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

  // Pull the homepage HTML and condense it to plaintext. We also
  // keep the raw HTML around for logo-discovery further down.
  let pageText = "";
  let rawHtml = "";
  try {
    const fetchRes = await fetch(url.toString(), {
      headers: HEADERS,
      // Give corporate sites a generous-ish timeout via signal.
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (fetchRes.ok) {
      rawHtml = await fetchRes.text();
      pageText = extractText(rawHtml);
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

  // Try to find a real logo on the homepage before falling back to
  // Google's 128px favicon. The discoverer walks every signal a
  // brand-aware site exposes (og:logo, apple-touch-icon, mask-icon,
  // schema.org Organization.logo, `<img class="logo">`, sized PWA
  // icons, og:image / twitter:image, …) and picks the highest-scored
  // candidate. Favicon stays as the last-resort safety net.
  const discovered = rawHtml ? discoverLogoFromHtml(rawHtml, url) : null;
  const logo =
    discovered ?? `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;

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
