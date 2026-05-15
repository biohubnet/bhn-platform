/**
 * Helpers for rendering the employer logo with the operator-chosen
 * mask shape. Lives in its own file so both the edit modal (client)
 * and the /employer page (server component) can import without
 * tugging in unrelated Prisma bits.
 *
 * Shapes:
 *   • "natural" / null / ""   — keep the existing circular disc with
 *                              the logo image contained inside (the
 *                              behaviour the page shipped with). The
 *                              logo image itself isn't masked — only
 *                              the outer disc.
 *   • "circle"                — the logo image is cropped to a circle
 *                              (cover the disc). Useful for square-
 *                              ish logos that look good edge-to-edge.
 *   • "rounded"               — square-cropped logo with rounded
 *                              corners.
 *   • "square"                — square-cropped logo, no rounding.
 *
 * `containerMask` controls the wrapper shape (`rounded-full`,
 * `rounded-2xl`, etc.). `imageFit` controls whether the logo fills
 * the wrapper (`object-cover`) or sits inside it (`object-contain`).
 */
export type LogoShape = "natural" | "circle" | "rounded" | "square";

export function normalizeLogoShape(raw: string | null | undefined): LogoShape {
  switch (raw) {
    case "circle":
    case "rounded":
    case "square":
    case "natural":
      return raw;
    default:
      return "natural";
  }
}

export function logoShapeClasses(shape: LogoShape): {
  /** Tailwind class for the outer container's shape. */
  containerMask: string;
  /** Tailwind class for the inner `<img>` — `object-contain` for
   *  "natural", `object-cover` for the cropping shapes. */
  imageFit: string;
} {
  switch (shape) {
    case "circle":
      return { containerMask: "rounded-full", imageFit: "object-cover" };
    case "rounded":
      return { containerMask: "rounded-2xl",  imageFit: "object-cover" };
    case "square":
      return { containerMask: "rounded-none", imageFit: "object-cover" };
    case "natural":
    default:
      return { containerMask: "rounded-full", imageFit: "object-contain" };
  }
}
