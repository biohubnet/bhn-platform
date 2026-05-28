import { ImageResponse } from "next/og";

/**
 * Default Open Graph + Twitter share card.
 *
 * Renders the BioHubNet four-diamond mark + tri-colour wordmark +
 * tagline at the standard 1200×630 size used by every major social
 * preview. Twitter / X falls back to this when no twitter-image is
 * set.
 *
 * Mirrors the canonical mark from src/components/ui/Logo.tsx and the
 * favicon at src/app/icon.tsx — same 4-diamond cluster, same brand
 * teal/blue/mint palette. Stripes are drawn as explicit <rect>
 * clipped by polygon `clipPath`s since Satori (next/og's renderer)
 * doesn't support `<pattern>`.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BioHubNet — Transformative Talent Development";

const COLOR_TEAL = "#2D7872";
const COLOR_BLUE = "#187FB0";
const COLOR_MINT = "#7DC495";

const DIAMONDS: Array<{ id: string; points: string; color: string }> = [
  { id: "og-d-tl", points: "25,2 50,27 25,52 0,27",    color: COLOR_TEAL },
  { id: "og-d-tr", points: "75,2 100,27 75,52 50,27",  color: COLOR_MINT },
  { id: "og-d-bl", points: "25,42 50,67 25,92 0,67",   color: COLOR_BLUE },
  { id: "og-d-br", points: "75,42 100,67 75,92 50,67", color: COLOR_MINT },
];

const STRIPE_Y_OFFSETS = [4, 12, 20, 28, 36];
const STRIPE_HEIGHT = 5;

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
        {/* Four-diamond mark at 320 px — readable at preview thumbnail
            sizes (Slack's 80×80, iMessage's 100×100) without losing
            the cluster structure. */}
        <svg width="320" height="320" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {DIAMONDS.map((d) => (
              <clipPath id={d.id} key={d.id}>
                <polygon points={d.points} />
              </clipPath>
            ))}
          </defs>
          {DIAMONDS.map((d) => {
            const topY = Math.min(
              ...d.points.split(" ").map((p) => Number(p.split(",")[1])),
            );
            return (
              <g key={d.id} clipPath={`url(#${d.id})`}>
                {STRIPE_Y_OFFSETS.map((dy) => (
                  <rect
                    key={dy}
                    x="0"
                    y={topY + dy}
                    width="100"
                    height={STRIPE_HEIGHT}
                    fill={d.color}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Tri-colour wordmark. Each segment uses its companion
            diamond colour so the mark + word reads as one lock-up. */}
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -1,
            marginTop: 28,
          }}
        >
          <span style={{ color: COLOR_TEAL }}>Bio</span>
          <span style={{ color: COLOR_BLUE }}>Hub</span>
          <span style={{ color: COLOR_MINT }}>Net</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: COLOR_TEAL,
            marginTop: 16,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Transformative Talent Development
        </div>
      </div>
    ),
    size,
  );
}
