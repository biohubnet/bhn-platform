const BIOHUBNET_REVIEW_HOSTS = new Set(["biohubnet.ca", "www.biohubnet.ca"]);

export const PAGE_REVIEW_HASH_KEY = "bhn-review";

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
