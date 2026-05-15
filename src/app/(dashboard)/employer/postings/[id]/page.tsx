import { redirect } from "next/navigation";

/**
 * /employer/postings/[id] — historical per-posting detail. Now
 * redirects to /employer with an anchor so the workspace expands
 * the matching posting on landing.
 *
 * Kept alive for deep links (email notifications, audit log,
 * external bookmarks).
 */
export default async function PostingDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/employer#posting-${id}`);
}
