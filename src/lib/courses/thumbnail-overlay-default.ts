/**
 * Server-only helpers for the *site-wide default* thumbnail overlay.
 *
 * Admins can mark a colour / gradient overlay as the platform-wide
 * default from /admin/cover-art's overlay builder. That JSON is
 * persisted in the `PlatformSetting` table under
 * `key = "defaultThumbnailOverlay"`. Per-item custom overlays still
 * win over the default; the default is only applied to items that
 * don't have one of their own.
 *
 * Why this lives in its own file
 *   The base `thumbnail-overlay.ts` is shared between client + server
 *   (parseOverlay / overlayStyle render in the catalog), so it
 *   intentionally has no Prisma import. Anything that touches the DB
 *   lives here, server-only.
 */
import { prisma } from "@/lib/prisma";
import { parseOverlay, type ThumbnailOverlay } from "@/lib/courses/thumbnail-overlay";
import { Prisma } from "@prisma/client";

export const DEFAULT_OVERLAY_KEY = "defaultThumbnailOverlay";

/**
 * Read the current site-wide default overlay, or null if none is set
 * (or the stored JSON has drifted out of shape). All errors are
 * swallowed → null so a missing row never takes down a regenerate.
 */
export async function getDefaultThumbnailOverlay(): Promise<ThumbnailOverlay | null> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: DEFAULT_OVERLAY_KEY },
    });
    if (!row?.value) return null;
    return parseOverlay(JSON.parse(row.value));
  } catch {
    return null;
  }
}

/**
 * Persist (or clear) the site-wide default. Pass null to remove the
 * row. Upsert so the first save creates and subsequent saves replace.
 */
export async function setDefaultThumbnailOverlay(
  overlay: ThumbnailOverlay | null,
): Promise<void> {
  if (overlay === null) {
    await prisma.platformSetting
      .deleteMany({ where: { key: DEFAULT_OVERLAY_KEY } })
      .catch(() => undefined);
    return;
  }
  const value = JSON.stringify(overlay);
  await prisma.platformSetting.upsert({
    where: { key: DEFAULT_OVERLAY_KEY },
    create: { key: DEFAULT_OVERLAY_KEY, value },
    update: { value },
  });
}

/**
 * Apply the platform default to a single course or pathway that
 * currently has no overlay of its own. Used at regenerate time so a
 * freshly-rendered thumbnail picks up the site-wide treatment
 * automatically. Per-item custom overlays are preserved.
 *
 * Returns the overlay that was applied, or null if nothing happened
 * (no default set, or the row already had a custom overlay).
 */
export async function applyDefaultOverlayIfAbsent(
  kind: "course" | "pathway",
  id: string,
): Promise<ThumbnailOverlay | null> {
  const overlay = await getDefaultThumbnailOverlay();
  if (!overlay) return null;

  const overlayJson = overlay as unknown as Prisma.InputJsonValue;

  if (kind === "pathway") {
    const r = await prisma.pathway.findUnique({
      where: { id },
      select: { thumbnailOverlay: true },
    });
    if (!r) return null;
    if (r.thumbnailOverlay) return null; // respect per-item customisation
    await prisma.pathway.update({
      where: { id },
      data: { thumbnailOverlay: overlayJson },
    });
    return overlay;
  } else {
    const r = await prisma.course.findUnique({
      where: { id },
      select: { thumbnailOverlay: true },
    });
    if (!r) return null;
    if (r.thumbnailOverlay) return null;
    await prisma.course.update({
      where: { id },
      data: { thumbnailOverlay: overlayJson },
    });
    return overlay;
  }
}
