const BIOHUBNET_REVIEW_HOSTS = new Set(["biohubnet.ca", "www.biohubnet.ca"]);

export const PAGE_REVIEW_HASH_KEY = "bhn-review";
export const PAGE_REVIEW_VIEWER_KEY = "bhn-reviewer";

/** Canonical form used to avoid opening duplicate sessions for the same page. */
export function normalizeReviewUrl(value: string): string {
  const trimmed = value.trim();
  const input = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const target = new URL(input);
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new TypeError("Only web URLs can be reviewed.");
  }
  target.hash = "";
  if (target.hostname.toLowerCase() === "www.biohubnet.ca") {
    target.hostname = "biohubnet.ca";
  }
  target.pathname = target.pathname === "/" ? "/" : target.pathname.replace(/\/+$/, "");
  target.searchParams.sort();
  return target.toString();
}

const UPPERCASE_PAGE_WORDS = new Set(["api", "faq", "gmp", "hqp", "ke"]);

/** Derive a concise page label without making a server-side request to the URL. */
export function pageNameFromReviewUrl(value: string): string {
  const target = new URL(normalizeReviewUrl(value));
  const parts = target.pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return target.hostname === "biohubnet.ca" ? "Home Page" : target.hostname;
  }

  const slug = decodeURIComponent(parts.at(-1) ?? "");
  const words = slug.split(/[-_]+/).filter(Boolean);
  if (words.length === 0) return target.hostname;

  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (UPPERCASE_PAGE_WORDS.has(lower) || /^[a-z]{1,3}\d+$/i.test(word)) {
        return lower.toUpperCase();
      }
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

/** Build a direct review link only for sites where the review loader is installed. */
export function reviewLinkFor(url: string, shareToken: string): string | null {
  try {
    const target = new URL(url);
    if (
      target.protocol !== "https:" ||
      !BIOHUBNET_REVIEW_HOSTS.has(target.hostname.toLowerCase()) ||
      (target.port !== "" && target.port !== "443") ||
      target.username !== "" ||
      target.password !== ""
    ) {
      return null;
    }

    const fragment = new URLSearchParams();
    fragment.set(PAGE_REVIEW_HASH_KEY, shareToken);
    target.hash = fragment.toString();
    return target.toString();
  } catch {
    return null;
  }
}
