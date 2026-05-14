import { ImageResponse } from "next/og";

/**
 * Default Open Graph + Twitter share card.
 *
 * Renders the BioHubNet diamond-cluster mark + the tri-colour
 * wordmark + tagline at the standard 1200×630 size used by every
 * major social preview. Twitter / X falls back to this when no
 * twitter-image is set.
 *
 * The mark SVG primitives are inlined (not imported from the
 * shared component) because next/og's ImageResponse runs in an
 * isolated edge sandbox — we keep this file self-contained so the
 * build doesn't trip over the cn() helper or any non-runtime
 * imports the shared LogoMark carries.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BioHubNet — Transformative Talent Development";

const BHN = { teal: "#327A80", blue: "#1A8DB6", mint: "#7FC9A5" } as const;

const STRIPES = [
  { y: 9.5, h: 1.6 },
  { y: 14.5, h: 2.2 },
  { y: 20, h: 1.6 },
  { y: 25.5, h: 2.2 },
  { y: 31, h: 1.6 },
  { y: 36.5, h: 2.2 },
  { y: 42, h: 1.6 },
  { y: 47.5, h: 2.2 },
  { y: 53, h: 1.6 },
];

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
        {/* Mark — scaled to ~340 px so the cluster is unmistakable */}
        <svg width="340" height="340" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="og-tl">
              <path d="M18,4 L32,18 L18,32 L4,18 Z" />
            </clipPath>
            <clipPath id="og-tr">
              <path d="M46,4 L60,18 L46,32 L32,18 Z" />
            </clipPath>
            <clipPath id="og-mid">
              <path d="M32,18 L46,32 L32,46 L18,32 Z" />
            </clipPath>
            <clipPath id="og-btm">
              <path d="M32,32 L46,46 L32,60 L18,46 Z" />
            </clipPath>
          </defs>
          <g clipPath="url(#og-tl)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.teal} />
            {STRIPES.map((s) => (
              <rect key={`og-tl${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
          <g clipPath="url(#og-tr)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.mint} />
            {STRIPES.map((s) => (
              <rect key={`og-tr${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
          <g clipPath="url(#og-btm)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.blue} />
            {STRIPES.map((s) => (
              <rect key={`og-b${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
          <g clipPath="url(#og-mid)">
            <rect x="0" y="0" width="64" height="64" fill={BHN.blue} />
            {STRIPES.map((s) => (
              <rect key={`og-m${s.y}`} x="0" y={s.y} width="64" height={s.h} fill="white" />
            ))}
          </g>
        </svg>

        {/* Wordmark — tri-colour exactly as in the brand standard */}
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -1,
            marginTop: 28,
          }}
        >
          <span style={{ color: BHN.teal }}>Bio</span>
          <span style={{ color: BHN.blue }}>Hub</span>
          <span style={{ color: BHN.mint }}>Net</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: BHN.teal,
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
