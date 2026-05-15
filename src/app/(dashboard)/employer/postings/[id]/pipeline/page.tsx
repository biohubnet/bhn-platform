import { redirect } from "next/navigation";

/**
 * /employer/postings/[id]/pipeline — historical Kanban surface,
 * now redirected to /applicants.
 *
 * The new ApplicantsBoard at /employer/postings/[id]/applicants
 * carries both Kanban and List view modes in a single page, plus the
 * full recruiter toolkit (filter / sort / bulk-select / drawer with
 * AI fit breakdown). Maintaining a second "pipeline" page was extra
 * cognitive load with no extra capability — both routes were doing
 * the same job through different visual chrome.
 *
 * The route stays alive (instead of being deleted) so older bookmarks,
 * audit-log entries, and email links don't 404. Anyone landing here
 * gets bounced to the single canonical surface.
 */
export default async function PipelineRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/employer/postings/${id}/applicants`);
}
