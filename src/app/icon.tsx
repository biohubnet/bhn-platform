import { ImageResponse } from "next/og";

/**
 * Favicon — BioHubNet hexagon hub-network mark at 64×64. Mirrors the
 * geometry of <LogoMark> in src/components/ui/Logo.tsx and the
 * standalone /public/biohubnet-logo.svg: six nodes joined by bonds
 * into a hexagonal ring around a rounded diamond hub (Bio = hexagon,
 * Hub = diamond core, Net = the connected nodes). Apex node carries
 * the bio green, the hub the brand blue, the rest the ink teal.
 *
 * Note: ImageResponse renders via Satori, which doesn't support SVG
 * `<symbol>` / `<use>`, and default SVG fills are black — every
 * element here sets its fill explicitly.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const INK = "#1F5A68";
const HUB_BLUE = "#1B7FB8";
const BIO_GREEN = "#4FA475";

const RING_PATH =
  "M 24 8.5 L 37.42 16.25 L 37.42 31.75 L 24 39.5 L 10.58 31.75 L 10.58 16.25 Z";

const SPOKE_PATH =
  "M 24 24 L 24 8.5 M 24 24 L 37.42 31.75 M 24 24 L 10.58 31.75";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#f7fafb 0%,#e9f2f4 100%)",
        }}
      >
        <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      </div>
    ),
    size,
  );
}
