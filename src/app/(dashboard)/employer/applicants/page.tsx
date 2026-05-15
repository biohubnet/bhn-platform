import { redirect } from "next/navigation";

/**
 * /employer/applicants — historical cross-posting top-of-funnel.
 *
 * Applicants live INSIDE postings in the HR workspace at
 * /employer/postings: expanding a posting row reveals its applicant
 * pipeline inline. We redirect there so the sidebar "Applicants"
 * entry — and any older bookmarks — land on the correct surface.
 */
export default async function ApplicantsRedirect() {
  redirect("/employer/postings");
}
