"use client";

/**
 * Diverse head-silhouette avatars with deterministic pastel coloring.
 *
 * Pure local SVG — no avatar service, no external requests. Variation
 * comes from two axes hashed from the person's stable id:
 *   • style — 0..7, picks a different head shape (short hair, long hair,
 *     ponytail, bun, glasses, beard, cap, bald)
 *   • color — index into a curated 14-tone pastel palette
 *
 * The same id always renders the same avatar, even after a page reload.
 * Two people with the same id collision would render identically, but
 * scenarios use slug-style ids ("marcus-reid", "vp-priya") so collisions
 * are rare and visually similar people in the same roster are fine.
 */

const PASTEL_PALETTE = [
  { fill: "#FFD4B8", stroke: "#D9985A", deep: "#A66726" }, // peach
  { fill: "#C7F0DB", stroke: "#6BB893", deep: "#2E6B49" }, // mint
  { fill: "#C4DDF5", stroke: "#6A9CCF", deep: "#264F7A" }, // sky
  { fill: "#DCD0F5", stroke: "#9685D6", deep: "#4F3E94" }, // lavender
  { fill: "#F8D0DC", stroke: "#D27A95", deep: "#823252" }, // rose
  { fill: "#F5EAB8", stroke: "#C9B36A", deep: "#7A6320" }, // lemon
  { fill: "#D5E4C5", stroke: "#82A66A", deep: "#3F5826" }, // sage
  { fill: "#FFC7C2", stroke: "#D2766E", deep: "#7E2A22" }, // coral
  { fill: "#C7CFF5", stroke: "#7989D6", deep: "#2D3D94" }, // periwinkle
  { fill: "#FFE0B8", stroke: "#D9A85A", deep: "#9F6F1F" }, // apricot
  { fill: "#E5D4F5", stroke: "#A687D6", deep: "#583F94" }, // lilac
  { fill: "#BDE5DD", stroke: "#5DAB9F", deep: "#1F6358" }, // teal
  { fill: "#FAEBC9", stroke: "#D6B86A", deep: "#86631E" }, // buttercream
  { fill: "#C8D2E5", stroke: "#6F7FAF", deep: "#2A3A6E" }, // slate-blue
] as const;

type Style = {
  /** Hair / top render. Returns SVG paths drawn on top of the base head. */
  hair: (color: { fill: string; stroke: string; deep: string }) => React.ReactNode;
  /** Optional accessory (glasses, beard, cap brim) — rendered after hair. */
  accessory?: (color: { fill: string; stroke: string; deep: string }) => React.ReactNode;
};

/**
 * Eight head styles. Each draws its hair / accessories layered on top of
 * the base head circle + shoulders. The base shape is identical across
 * styles so the silhouettes feel consistent.
 */
const STYLES: Style[] = [
  // 0 — short crop (small cap of hair on top)
  {
    hair: (c) => (
      <path
        d="M 14 11 Q 20 6 26 11 Q 26 13 24 13 L 16 13 Q 14 13 14 11 Z"
        fill={c.deep}
        opacity="0.85"
      />
    ),
  },
  // 1 — long hair (hair drapes down past the head)
  {
    hair: (c) => (
      <>
        <path
          d="M 12 13 Q 13 6 20 6 Q 27 6 28 13 L 28 22 Q 24 19 20 19 Q 16 19 12 22 Z"
          fill={c.deep}
          opacity="0.85"
        />
      </>
    ),
  },
  // 2 — ponytail (small triangle behind the head)
  {
    hair: (c) => (
      <>
        <path
          d="M 14 11 Q 20 6 26 11 Q 26 13 24 13 L 16 13 Q 14 13 14 11 Z"
          fill={c.deep}
          opacity="0.85"
        />
        <ellipse
          cx="28.5"
          cy="14"
          rx="2.5"
          ry="4"
          fill={c.deep}
          opacity="0.75"
        />
      </>
    ),
  },
  // 3 — bun (small circle on top of head)
  {
    hair: (c) => (
      <>
        <path
          d="M 14 12 Q 20 7 26 12 Q 26 13 25 13 L 15 13 Q 14 13 14 12 Z"
          fill={c.deep}
          opacity="0.85"
        />
        <circle cx="20" cy="6.5" r="2.5" fill={c.deep} opacity="0.85" />
      </>
    ),
  },
  // 4 — glasses (subtle hair + rectangle glasses across eyes)
  {
    hair: (c) => (
      <path
        d="M 15 11 Q 20 7 25 11 Q 25 12.5 23.5 12.5 L 16.5 12.5 Q 15 12.5 15 11 Z"
        fill={c.deep}
        opacity="0.75"
      />
    ),
    accessory: (c) => (
      <g
        stroke={c.deep}
        strokeWidth="0.9"
        fill="none"
        opacity="0.85"
      >
        <circle cx="17.4" cy="16.2" r="1.7" />
        <circle cx="22.6" cy="16.2" r="1.7" />
        <line x1="19.1" y1="16.2" x2="20.9" y2="16.2" />
      </g>
    ),
  },
  // 5 — beard (full head of hair + small beard at chin)
  {
    hair: (c) => (
      <path
        d="M 13 12 Q 14 6 20 6 Q 26 6 27 12 Q 26 13 25 13 L 15 13 Q 14 13 13 12 Z"
        fill={c.deep}
        opacity="0.85"
      />
    ),
    accessory: (c) => (
      <path
        d="M 16 18.5 Q 16.5 21.5 20 22 Q 23.5 21.5 24 18.5 Q 22.5 19.5 20 19.5 Q 17.5 19.5 16 18.5 Z"
        fill={c.deep}
        opacity="0.55"
      />
    ),
  },
  // 6 — cap (peaked brim above forehead)
  {
    hair: (c) => (
      <>
        <path
          d="M 14 11.5 Q 20 8 26 11.5 Q 26 12.5 25 12.5 L 15 12.5 Q 14 12.5 14 11.5 Z"
          fill={c.deep}
          opacity="0.5"
        />
        {/* Cap dome */}
        <path
          d="M 13 11 Q 13 6 20 6 Q 27 6 27 11 Z"
          fill={c.deep}
          opacity="0.85"
        />
        {/* Brim */}
        <path
          d="M 11 11 Q 20 9 29 11 L 29 12 Q 20 11 11 12 Z"
          fill={c.deep}
          opacity="0.9"
        />
      </>
    ),
  },
  // 7 — bald (clean head, subtle highlight)
  {
    hair: () => null,
    accessory: () => null,
  },
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getAvatarSeed(id: string) {
  const h = hash(id);
  return {
    style: h % STYLES.length,
    color: Math.floor(h / 7) % PASTEL_PALETTE.length,
  };
}

type AvatarProps = {
  id: string;
  name?: string;
  size?: number;
  active?: boolean;
  className?: string;
};

export function Avatar({
  id,
  name,
  size = 32,
  active = false,
  className = "",
}: AvatarProps) {
  const seed = getAvatarSeed(id);
  const color = PASTEL_PALETTE[seed.color];
  const style = STYLES[seed.style];

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label={name ?? "avatar"}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        role="img"
        aria-hidden={!name}
      >
        {/* Background disc — pastel fill, slightly darker stroke */}
        <circle
          cx="20"
          cy="20"
          r="19.25"
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth="0.75"
          opacity="0.9"
        />

        {/* Shoulders — same tone as background, slightly darker */}
        <path
          d="M 6 36 C 7 28, 13 25, 20 25 C 27 25, 33 28, 34 36 L 34 40 L 6 40 Z"
          fill={color.stroke}
          opacity="0.55"
        />

        {/* Neck */}
        <rect
          x="18.2"
          y="22.5"
          width="3.6"
          height="3.5"
          fill={color.stroke}
          opacity="0.65"
        />

        {/* Base head */}
        <circle
          cx="20"
          cy="16"
          r="6"
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth="0.4"
          opacity="0.95"
        />

        {/* Hair layer (varies by style) */}
        {style.hair(color)}

        {/* Accessory layer (glasses, beard, etc.) */}
        {style.accessory?.(color)}
      </svg>

      {active && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-brand-500 ring-offset-2 ring-offset-card-solid"
          style={{ borderRadius: "9999px" }}
          aria-hidden
        />
      )}
    </div>
  );
}
