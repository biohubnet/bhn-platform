/**
 * displayCourseDescription — normalise a raw course description for
 * rendering on cards, search results, and detail pages.
 *
 * History — when the bulk SCORM uploader (`scripts/bulk-upload-scorm.ts`)
 * imported a SCORM 1.2 / 2004 package, it stamped every new Course row
 * with a placeholder description in the form:
 *
 *     "SCORM 1.2 / 2004 module — <Course Title>"
 *
 * That placeholder leaked all the way through to the catalog cards
 * because the card renders `course.description` verbatim. This helper
 * strips that placeholder so cards / search results / detail pages
 * don't display it. The data-side fix (`scripts/seed-course-card-fields.ts`
 * → run against the live DB) replaces those placeholders with proper
 * blurbs from the BLURB_BANK; until that backfill runs, this helper
 * stops the boilerplate from rendering.
 *
 * Returns:
 *   • `null` if the description is empty, only whitespace, OR is
 *     entirely the SCORM placeholder (with or without the title
 *     trailing it).
 *   • Otherwise the description with any SCORM-prefix stripped.
 *
 * Use:
 *   const blurb = displayCourseDescription(course.description);
 *   {blurb && <p>{blurb}</p>}
 */

const SCORM_BOILERPLATE_PREFIX = /^\s*SCORM\s+1\.2\s*\/?\s*2004\s+module\s*(—|-|–|:)?\s*/i;

export function displayCourseDescription(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // If the whole string is the SCORM boilerplate (with or without a
  // title appended), drop it entirely.
  const stripped = trimmed.replace(SCORM_BOILERPLATE_PREFIX, "").trim();
  if (stripped === "") return null;

  return stripped;
}
