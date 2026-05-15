import { redirect } from "next/navigation";

/**
 * /employer/applicants — historical cross-posting top-of-funnel,
 * now redirects to the unified workspace at /employer where every
 * posting expands inline to show its own applicants list.
 *
 * Kept alive so older bookmarks + audit-log references don't 404.
 */
export default async function ApplicantsRedirect() {
  redirect("/employer");
}
