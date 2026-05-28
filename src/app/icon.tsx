import { ImageResponse } from "next/og";

/**
 * Favicon — BioHubNet four-diamond mark at 64×64. Mirrors the inline
 * <LogoMark> in src/components/ui/Logo.tsx and the standalone SVG at
 * /public/biohubnet-logo.svg.
 *
 * Satori (next/og's renderer) supports a limited SVG subset — no
 * <pattern>, no <use>, no advanced clipPath. The stripes here are
 * therefore drawn as explicit <rect> bars individually clipped to
 * each diamond's polygon. Verbose but renders the same composition
 * as the runtime <LogoMark>.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const COLOR_TEAL = "#2D7872";
const COLOR_BLUE = "#187FB0";
const COLOR_MINT = "#7DC495";

// Diamond polygons in a 100×100 viewBox. Top row at y≈2–52, bottom
// row at y≈42–92 — the 10-unit vertical overlap is what makes the
// cluster read as connected.
const DIAMONDS: Array<{ id: string; points: string; color: string }> = [
  { id: "d-tl", points: "25,2 50,27 25,52 0,27",   color: COLOR_TEAL },
  { id: "d-tr", points: "75,2 100,27 75,52 50,27", color: COLOR_MINT },
  { id: "d-bl", points: "25,42 50,67 25,92 0,67",  color: COLOR_BLUE },
  { id: "d-br", points: "75,42 100,67 75,92 50,67", color: COLOR_MINT },
];

// Horizontal stripe y-positions (5 stripes per diamond, each 5
// units tall, gap 3 units). Mapped to the diamond's local bounds.
const STRIPE_Y_OFFSETS = [4, 12, 20, 28, 36];
const STRIPE_HEIGHT = 5;

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
          background: "linear-gradient(135deg,#eef2f4 0%,#dfe7ee 100%)",
        }}
      >
        <svg width="56" height="56" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {DIAMONDS.map((d) => (
              <clipPath id={d.id} key={d.id}>
                <polygon points={d.points} />
              </clipPath>
            ))}
          </defs>
          {DIAMONDS.map((d) => {
            // Diamond's top tip y = stripe origin. Compute it from the
            // polygon points so the stripes anchor correctly per row.
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
      </div>
    ),
    size,
  );
}
