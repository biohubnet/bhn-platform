/**
 * Logo discovery from a company homepage's HTML.
 *
 * Walks every signal a brand-aware homepage typically exposes, scores
 * each candidate, and returns them all in order. Callers can either
 * pick the top score (auto-fill) or surface the list to the operator
 * (the modal "pick a logo" UX).
 *
 * Scoring rationale (higher = better):
 *   • og:logo                              100   — explicit, designed-for-this
 *   • schema.org Organization.logo (JSON-LD) 90  — structured-data first-party
 *   • apple-touch-icon (sized variants)    60+   — 180 px iOS springboard
 *                                                 icon, almost always
 *                                                 the cleanest single-square mark
 *   • mask-icon (Safari)                   55    — SVG, monochrome, cropped to glyph
 *   • og:image                             50    — social card; sometimes
 *                                                 the logo, sometimes a hero image
 *   • twitter:image                        45    — similar to og:image
 *   • <img class="logo">                   35    — header logo from the page
 *   • <link rel="icon" sizes=">=96">       30+   — sized PWA icons
 *
 * Bonuses:
 *   • SVG                                  +10   — vector scales cleanly
 *   • Favicon-in-disguise (size 16/24/32)  -25   — likely too small
 */

export interface LogoCandidate {
  /** Absolute URL of the candidate logo asset. */
  url: string;
  /** Short human label describing where this candidate came from. */
  source: string;
  /** Internal score (higher = better). Surfaced so callers can build
   *  a sensible "best one" indicator. */
  score: number;
}

/** Fetch the homepage with a desktop-Chrome User-Agent. Some corporate
 *  sites block bot-flavoured requests. Falls back to an empty string
 *  on any error so callers can degrade gracefully. */
export async function fetchHomepageHtml(url: URL): Promise<string> {
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

/** Walk the HTML for every brand signal a homepage exposes and return
 *  the candidates sorted best-first. Caller decides whether to pick
 *  the top score, surface the list, or fall back to a favicon. */
export function discoverLogoCandidates(html: string, pageUrl: URL): LogoCandidate[] {
  const out: LogoCandidate[] = [];
  const seen = new Set<string>();

  const resolve = (href: string) => {
    try { return new URL(href, pageUrl).toString(); }
    catch { return null; }
  };
  const push = (href: string | undefined | null, score: number, source: string) => {
    if (!href) return;
    const abs = resolve(href);
    if (!abs) return;
    // Drop obvious tracking pixels / placeholder names.
    if (/1x1|spacer|pixel|blank/i.test(abs)) return;
    // Dedupe URLs while keeping the highest score for each.
    if (seen.has(abs)) {
      const existing = out.find((c) => c.url === abs);
      if (existing && score > existing.score) existing.score = score;
      return;
    }
    seen.add(abs);
    out.push({ url: abs, source, score });
  };

  // og:logo — rare, but most authoritative when present.
  const ogLogo =
    /<meta[^>]+property=["']og:logo["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  push(ogLogo, 100, "og:logo");

  // schema.org Organization.logo (JSON-LD) — many corporate sites
  // carry this. Parse every <script type="application/ld+json">.
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const blob = JSON.parse(m[1].trim());
      const blobs = Array.isArray(blob) ? blob : [blob];
      for (const b of blobs) {
        if (!b || typeof b !== "object") continue;
        const t = b as Record<string, unknown>;
        const logoFromUrl = typeof t.logo === "string"
          ? t.logo
          : (t.logo && typeof t.logo === "object" && (t.logo as Record<string, unknown>).url) as string | undefined;
        if (logoFromUrl) push(logoFromUrl, 90, "JSON-LD logo");
        // Some sites stash the logo only on the image / brand fields.
        const image = typeof t.image === "string"
          ? t.image
          : (t.image && typeof t.image === "object" && (t.image as Record<string, unknown>).url) as string | undefined;
        if (image) push(image, 65, "JSON-LD image");
      }
    } catch { /* ignore */ }
  }

  // mask-icon (Safari pinned-tab SVG).
  const maskIcon =
    /<link[^>]+rel=["']mask-icon["'][^>]+href=["']([^"']+)["']/i.exec(html)?.[1]
    ?? /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']mask-icon["']/i.exec(html)?.[1];
  push(maskIcon, 55, "mask-icon (SVG)");

  // apple-touch-icon — possibly multiple sized variants; prefer larger.
  for (const m of html.matchAll(/<link\b[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*>/gi)) {
    const tag = m[0];
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    const sizes = /sizes=["']([^"']+)["']/i.exec(tag)?.[1];
    const sizeNum = sizes ? parseInt(sizes.split("x")[0], 10) || 0 : 180;
    push(href, 60 + Math.min(Math.max(sizeNum, 0) / 6, 30), `apple-touch-icon${sizes ? ` ${sizes}` : ""}`);
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
    push(href, 30 + Math.min(sizeNum / 10, 30), `icon ${sizes}`);
  }

  // og:image — usually a social card, sometimes the brand mark.
  const ogImage =
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  push(ogImage, 50, "og:image");

  // Twitter image.
  const twImage =
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  push(twImage, 45, "twitter:image");

  // <img> tags whose class / id / alt screams "logo". Scan the head
  // and the first ~12 KB of the body (header / brand bar lives there).
  const headBody = html.slice(0, 12_000);
  for (const m of headBody.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/(?:class|alt|id)=["'][^"']*logo[^"']*["']/i.test(tag)) continue;
    const src =
      /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1]
      ?? /\bdata-src=["']([^"']+)["']/i.exec(tag)?.[1];
    push(src, 35, "<img class=logo>");
  }

  // Apply bonuses / penalties.
  for (const c of out) {
    if (/\.svg(?:\?|#|$)/i.test(c.url)) c.score += 10;
    if (/(?:width|w|size)=(?:16|24|32)\b/i.test(c.url)) c.score -= 25;
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

/** Convenience: pick the single best candidate, or null. */
export function pickBestLogo(html: string, pageUrl: URL): string | null {
  const candidates = discoverLogoCandidates(html, pageUrl);
  return candidates[0]?.url ?? null;
}

/** High-res fallback. Clearbit's free logo service returns a clean
 *  PNG (usually 256×256 or larger, often the brand's actual mark
 *  rather than the favicon) for any registered domain. Used in
 *  preference to the Google-favicons fallback because favicons are
 *  almost always 16–128 px — too small for the disc on /employer.
 *
 *  Source: https://clearbit.com/logo — free public endpoint, no key
 *  required for unauthenticated reads.*/
export function clearbitLogo(hostname: string): string {
  return `https://logo.clearbit.com/${hostname}?size=400`;
}

/** Absolute last-resort fallback when even Clearbit doesn't have the
 *  domain. Returns a 128 px PNG from Google's favicon service. Kept
 *  separate from clearbitLogo() so the auto-fill flow can prefer
 *  Clearbit and only fall through here if everything else fails. */
export function faviconFallback(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
}

/** Display-time upgrade for an existing companyLogo URL.
 *
 *  Profiles created before the high-res fallback chain landed (i.e.
 *  before commit 2362d4a) stored Google's `s2/favicons` URL when the
 *  homepage scrape missed the brand mark — which capped logos at
 *  128 px. Detect those URLs at render time and swap in the equivalent
 *  Clearbit URL (256 px+ for any registered domain).
 *
 *  Returns the original URL unchanged when it doesn't look like a
 *  Google-favicon fallback (real logo URLs from CDNs, uploaded
 *  R2 assets, etc.). Returns null when the input is null/undefined so
 *  callers can pass through to the briefcase placeholder.
 */
export function upgradeLogoForDisplay(url: string | null | undefined): string | null {
  if (!url) return null;
  // Google's free favicon service. We sniff the host because the
  // query string varies (sz=64 / sz=128 / no size). Extract the
  // `domain=...` param and forward it to Clearbit.
  const match = /^https?:\/\/(?:www\.)?google\.com\/s2\/favicons\?(.*)$/i.exec(url);
  if (!match) return url;
  const params = new URLSearchParams(match[1]);
  const domain = params.get("domain");
  if (!domain) return url;
  return clearbitLogo(domain);
}

/** Synchronous "best logo" picker with high-res fallback chain:
 *    1. Best candidate from homepage HTML (og:logo, JSON-LD, apple-
 *       touch-icon, etc.)
 *    2. Clearbit's hosted logo (256 px+, usually the brand mark)
 *    3. Nothing — caller can decide to render a placeholder
 *  Deliberately skips Google's 128 px favicon fallback here; favicons
 *  read as low-res chrome on the /employer disc. Callers who want
 *  the favicon-of-last-resort can call faviconFallback() explicitly. */
export function pickBestLogoWithFallback(html: string, pageUrl: URL): string {
  const fromHtml = pickBestLogo(html, pageUrl);
  if (fromHtml) return fromHtml;
  return clearbitLogo(pageUrl.hostname);
}
