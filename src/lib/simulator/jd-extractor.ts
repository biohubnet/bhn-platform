/**
 * Pull clean text from a job-description URL.
 *
 * Uses Jina Reader (https://r.jina.ai) — free, no auth required, returns
 * markdown extraction of any URL with JS rendering already done. This is
 * what makes LinkedIn / Indeed / company career sites work without us
 * running our own headless browser.
 *
 * Returns `{ ok: true, content }` on success or `{ ok: false, error }`
 * with a user-displayable message. Never throws.
 */
import crypto from "node:crypto";

const JINA_BASE = process.env.JINA_READER_BASE ?? "https://r.jina.ai";
const MAX_CONTENT_CHARS = 12000; // ~3000 tokens — plenty for any JD
const MIN_CONTENT_CHARS = 300;   // below this it's almost certainly an auth wall

export type ExtractResult =
  | { ok: true; content: string; jdSnippet: string; sourceHash: string }
  | { ok: false; error: string };

export async function extractJobDescription(
  rawUrl: string,
  promptVersion: string,
): Promise<ExtractResult> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { ok: false, error: "That doesn't look like a valid URL." };

  try {
    const reader = `${JINA_BASE}/${url}`;
    const res = await fetch(reader, {
      headers: {
        // Jina respects this header to return cleaner markdown without
        // navigation chrome and footer cruft.
        Accept: "text/plain",
        "X-Return-Format": "markdown",
      },
      // 25s timeout — Jina can be slow on LinkedIn / heavy SPAs.
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Couldn't fetch the page (${res.status}). The site may be blocking automated readers — try pasting the JD text directly when that option ships.`,
      };
    }

    const raw = await res.text();
    const cleaned = cleanMarkdown(raw);

    if (cleaned.length < MIN_CONTENT_CHARS) {
      return {
        ok: false,
        error:
          "That URL didn't return enough job-description text. Some sites (LinkedIn, Workday) require login to view the full posting. Try a public mirror or another source.",
      };
    }

    const content = cleaned.slice(0, MAX_CONTENT_CHARS);
    const jdSnippet = content.slice(0, 800);
    const sourceHash = crypto
      .createHash("sha256")
      .update(`${promptVersion}::${content}`)
      .digest("hex");

    return { ok: true, content, jdSnippet, sourceHash };
  } catch (e) {
    const msg = (e as Error).message ?? "unknown";
    return {
      ok: false,
      error: msg.includes("timeout")
        ? "The reader took too long to load that URL — try again, or use a different source."
        : `Couldn't read the URL: ${msg}`,
    };
  }
}

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    // Allow naked domains like "jobs.rbc.com/posting/123" by prepending https.
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    // Block obviously-non-job URLs to save the Jina round-trip.
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Strip the most common Jina output cruft: navigation lists, image
 * placeholders, redundant URL footers. We keep the rest verbatim — the
 * LLM does a better job than regex at picking out the JD body.
 */
function cleanMarkdown(raw: string): string {
  let s = raw;
  // Drop Jina's "Title:", "URL Source:", "Markdown Content:" headers
  s = s.replace(/^Title:\s*[^\n]*\n/i, "");
  s = s.replace(/^URL Source:\s*[^\n]*\n/i, "");
  s = s.replace(/^Markdown Content:\s*\n?/i, "");
  // Strip image references that survived ![...](...)
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  // Collapse 3+ newlines into 2
  s = s.replace(/\n{3,}/g, "\n\n");
  // Trim each line
  s = s.split("\n").map((l) => l.trimEnd()).join("\n").trim();
  return s;
}
