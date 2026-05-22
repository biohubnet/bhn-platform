/**
 * /employer/postings — retired 2026-05-21.
 *
 * The HR workspace (DSPageHeader hero + stats + action queue +
 * expandable posting rows with inline applicant pipelines) was
 * consolidated back into the brand-stage page at /employer. HR
 * users now start at the brand-stage home, which already carries
 * the action queue + posting list + KPI tiles.
 *
 * This route stays as a redirect so:
 *   • Old bookmarks + email links keep working.
 *   • The per-posting deep routes (/employer/postings/[id]/...)
 *     still resolve naturally — Next.js routes the [id] child
 *     before this index page sees the request, so a URL like
 *     /employer/postings/abc123/pipeline doesn't redirect.
 *
 * The retired workspace's visual treatment (DSPageHeader Studio
 * hero, stats strip, action-queue panel, posting-row pattern) is
 * archived at /design-archive/employer-postings-workspace.html for
 * future reuse.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function EmployerPostingsRedirect() {
  redirect("/employer");
}
