/**
 * /employer — retired 2026-05-21.
 *
 * The old HR home page (with the wavy aurora cover banner, company-
 * identity row, KPI tiles, action queue, posting list etc.) has been
 * consolidated into the workspace at /employer/postings. HR users
 * now start there directly — one fewer top-level surface to
 * navigate.
 *
 * This route stays as a permanent redirect so:
 *   • Old bookmarks + email links keep working.
 *   • Sandbox sign-ins land on the new entry point.
 *   • Internal `revalidatePath("/employer")` calls (in
 *     /api/employer/profile/{route,logo}/route.ts) still resolve.
 *
 * The retired cover banner is archived at
 * /design-archive/employer-cover-banner.html for future reuse.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function EmployerHomeRedirect() {
  redirect("/employer/postings");
}
