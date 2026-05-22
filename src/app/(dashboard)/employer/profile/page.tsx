import { redirect } from "next/navigation";

/**
 * /employer/profile — legacy alias.
 *
 * The profile design (cover banner, identity card, stats, postings
 * preview) is now the /employer home page; the standalone /profile
 * route is preserved as a redirect so any deep link out there
 * (changelog, old onboarding tour, bookmarks) keeps working.
 */
export default function LegacyEmployerProfileRedirect() {
  redirect("/employer");
}
