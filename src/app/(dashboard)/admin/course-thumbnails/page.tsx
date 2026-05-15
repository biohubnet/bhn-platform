import { redirect } from "next/navigation";

/**
 * /admin/course-thumbnails — legacy alias for /admin/cover-art.
 *
 * The page was renamed when pathways were folded into the same tool;
 * "cover art" reads as a designer-side concept that covers both
 * kinds. This alias keeps existing bookmarks, changelog links, and
 * the older onboarding tour CTA pointing to a working URL.
 */
export default function LegacyCourseThumbnailsRedirect() {
  redirect("/admin/cover-art");
}
