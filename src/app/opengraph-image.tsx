import { ImageResponse } from "next/og";

/**
 * Default Open Graph + Twitter share card.
 *
 * Renders the BioHubNet four-petal mark + the tri-colour wordmark
 * + tagline at the standard 1200×630 size used by every major
 * social preview. Twitter / X falls back to this when no
 * twitter-image is set.
 *
 * BUG FIX (May 2026): the previous version of this file drew a
 * different "diamond cluster with stripes" design that didn't
 * match the canonical brand mark anywhere else on the platform
 * (LogoMark in src/components/ui/Logo.tsx, icon.tsx, and
 * public/biohubnet-logo.svg all render the four-petal cluster).
 * Result: link previews on Slack / iMessage / LinkedIn / Twitter
 * showed a logo nobody recognised. This version mirrors the
 * canonical mark — four interlocking petals around a central
 * 4-pointed star, blue→green palette.
 *
 * The mark paths are inlined (not imported from the shared
 * component) because next/og's ImageResponse runs in an isolated
 * edge sandbox + uses Satori, which doesn't support SVG
 * `<symbol>` / `<use>` (LogoMark uses those for deduplication;
 * here we spell the petal path out four times). Same constraint
 * as icon.tsx.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BioHubNet — Transformative Talent Development";

/** Single petal pointing up. Same path as icon.tsx + LogoMark,
 *  in the 0..48 viewBox the mark uses; we rotate four copies
 *  90° apart around (24, 24) for the cluster. */
const PETAL_PATH =
  "M 24 2 C 35 2 43 9 43 19 C 43 24 39 26 33 25 C 28 23 26 23 24 23 C 22 23 20 23 15 25 C 9 26 5 24 5 19 C 5 9 13 2 24 2 Z";

/** Central 4-pointed star — drawn as a white fill on top of the
 *  petals so it reads as the negative-space cut-out. */
const STAR_PATH =
  "M 24 16 C 25 20 28 23 32 24 C 28 25 25 28 24 32 C 23 28 20 25 16 24 C 20 23 23 20 24 16 Z";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #ffffff 0%, #F4F8F8 55%, #E6F3F8 100%)",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Four-petal mark — 340 px so it reads at preview thumbnail
            sizes (Slack's 80×80, iMessage's 100×100) without losing
            the cluster's structure. Same gradient ramps as LogoMark. */}
        <svg width="340" height="340" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="og-petal-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#1d4f8b" />
              <stop offset="55%" stopColor="#2c8aa3" />
              <stop offset="100%" stopColor="#3fa86a" />
            </linearGradient>
            <linearGradient id="og-petal-right" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#52b066" />
              <stop offset="55%" stopColor="#3aa28a" />
              <stop offset="100%" stopColor="#1e6d9c" />
            </linearGradient>
            <linearGradient id="og-petal-bottom" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%"  stopColor="#1d4f8b" />
              <stop offset="50%" stopColor="#2674a0" />
              <stop offset="100%" stopColor="#48a25f" />
            </linearGradient>
            <linearGradient id="og-petal-left" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%"  stopColor="#173d6f" />
              <stop offset="55%" stopColor="#226d9a" />
              <stop offset="100%" stopColor="#3c9c63" />
            </linearGradient>
          </defs>
          <path d={PETAL_PATH} fill="url(#og-petal-top)" />
          <g transform="rotate(90 24 24)">
            <path d={PETAL_PATH} fill="url(#og-petal-right)" />
          </g>
          <g transform="rotate(180 24 24)">
            <path d={PETAL_PATH} fill="url(#og-petal-bottom)" />
          </g>
          <g transform="rotate(270 24 24)">
            <path d={PETAL_PATH} fill="url(#og-petal-left)" />
          </g>
          <path d={STAR_PATH} fill="#ffffff" />
        </svg>

        {/* Wordmark — tri-colour using the canonical brand gradient
            stops (deep navy / teal-blue / brand green). Picked from
            the same ramps as the petals so the cluster + wordmark
            read as one mark. */}
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -1,
            marginTop: 28,
          }}
        >
          <span style={{ color: "#1d4f8b" }}>Bio</span>
          <span style={{ color: "#2c8aa3" }}>Hub</span>
          <span style={{ color: "#3fa86a" }}>Net</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "#1d4f8b",
            marginTop: 8,
            letterSpacing: 0.5,
          }}
        >
          Transformative Talent Development
        </div>
      </div>
    ),
    size,
  );
}
