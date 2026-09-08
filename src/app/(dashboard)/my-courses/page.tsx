/**
 * /my-courses — legacy redirect.
 *
 * My Courses was folded into /progress (Sep 2026), and /progress was
 * then renamed back to "My Courses" in the nav. The two
 * pages had been splitting one job: the tracker held credits and a
 * read-only list of course titles, this page held the list you could
 * actually act on. /progress now carries both.
 *
 * Kept as a redirect rather than deleted — the route was in the nav for
 * months, so it is in bookmarks and in the body of published changelog
 * entries that users can still click.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function MyCoursesLegacyRedirect(): never {
  redirect("/progress");
}
