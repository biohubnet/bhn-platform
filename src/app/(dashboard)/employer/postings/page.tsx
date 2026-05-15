import { redirect } from "next/navigation";

/**
 * /employer/postings — historical entry point, now redirects to the
 * unified workspace at /employer where postings live as expandable
 * accordion rows.
 *
 * Kept alive so older bookmarks + audit-log references don't 404.
 */
export default async function PostingsRedirect() {
  redirect("/employer#postings");
}
