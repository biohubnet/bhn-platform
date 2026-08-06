const BIOHUBNET_REVIEW_HOSTS = new Set(["biohubnet.ca", "www.biohubnet.ca"]);

export const PAGE_REVIEW_HASH_KEY = "bhn-review";

/** Canonical form used to avoid opening duplicate sessions for the same page. */
export function normalizeReviewUrl(value: string): string {
  const target = new URL(value);
  target.hash = "";
  if (target.hostname.toLowerCase() === "www.biohubnet.ca") {
    target.hostname = "biohubnet.ca";
  }
  target.pathname = target.pathname === "/" ? "/" : target.pathname.replace(/\/+$/, "");
  target.searchParams.sort();
  return target.toString();
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
