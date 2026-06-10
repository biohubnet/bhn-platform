import { ImageResponse } from "next/og";

/**
 * Default Open Graph + Twitter share card.
 *
 * Renders the BioHubNet hexagon hub-network mark + the tri-colour
 * wordmark + tagline at the standard 1200×630 size used by every
 * major social preview. Twitter / X falls back to this when no
 * twitter-image is set.
 *
 * The mark is the name drawn literally — Bio = hexagon, Hub = the
 * rounded diamond core, Net = six nodes joined by bonds. Same
 * geometry + palette as <LogoMark> (src/components/ui/Logo.tsx),
 * icon.tsx, and public/biohubnet-logo.svg, so link previews show
 * exactly the mark people see on the platform.
 *
 * The mark elements are inlined (not imported from the shared
 * component) because next/og's ImageResponse runs in an isolated
 * edge sandbox + uses Satori, which doesn't support SVG
 * `<symbol>` / `<use>` and defaults missing fills to black — every
 * element sets its fill explicitly. Same constraint as icon.tsx.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BioHubNet — Transformative Talent Development";

const INK = "#1F5A68";
const HUB_BLUE = "#1B7FB8";
const BIO_GREEN = "#4FA475";
const TEXT_GREEN = "#3F9268";

const RING_PATH =
  "M 24 8.5 L 37.42 16.25 L 37.42 31.75 L 24 39.5 L 10.58 31.75 L 10.58 16.25 Z";

const SPOKE_PATH =
  "M 24 24 L 24 8.5 M 24 24 L 37.42 31.75 M 24 24 L 10.58 31.75";

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
        {/* Hexagon hub-network mark — 330 px so it reads at preview
            thumbnail sizes (Slack's 80×80, iMessage's 100×100)
            without losing the network structure. */}
        <svg width="330" height="330" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d={RING_PATH} fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d={SPOKE_PATH} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
          <rect
            x="18.7"
            y="18.7"
            width="10.6"
            height="10.6"
            rx="2.3"
            transform="rotate(45 24 24)"
            fill={HUB_BLUE}
          />
          <circle cx="24" cy="8.5" r="3.2" fill={BIO_GREEN} />
          <circle cx="37.42" cy="31.75" r="3.2" fill={INK} />
          <circle cx="10.58" cy="31.75" r="3.2" fill={INK} />
          <circle cx="37.42" cy="16.25" r="2.2" fill={INK} />
          <circle cx="24" cy="39.5" r="2.2" fill={INK} />
          <circle cx="10.58" cy="16.25" r="2.2" fill={INK} />
        </svg>

        {/* Wordmark — tri-colour: ink teal / hub blue / bio green,
            matching the lockup in public/biohubnet-logo.svg so the
            mark + wordmark read as one system. */}
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -1,
            marginTop: 24,
          }}
        >
          <span style={{ color: INK }}>Bio</span>
          <span style={{ color: HUB_BLUE }}>Hub</span>
          <span style={{ color: TEXT_GREEN }}>Net</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "#2E6B79",
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
