import { redirect } from "next/navigation";

/**
 * /employer/profile — legacy alias.
 *
 * The HR home page (cover banner + identity row + postings preview)
 * was retired 2026-05-21 in favour of /employer/postings as the
 * entry point. This route stays as a redirect so any deep link
 * out there (changelog, old onboarding tour, bookmarks) keeps
 * working. Redirects via /employer (which itself 308-redirects to
 * /employer/postings) so the chain stays short.
 */
export default function LegacyEmployerProfileRedirect() {
  redirect("/employer/postings");
}
