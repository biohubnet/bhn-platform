/**
 * /admin/committees — legacy redirect.
 *
 * The combined-committees admin page was split into per-committee
 * surfaces so each committee's entry point lives under its own
 * pillar's admin nav (HQP under ENGAGE, EQUIP Review under EQUIP).
 * This route used to host both rosters; it now redirects to the
 * HQP page since that's where the bulk of the workflow surfaces
 * lived. The EQUIP Review roster has its own page at
 * /admin/committees/equip-review.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminCommitteesIndexPage(): never {
  redirect("/admin/committees/hqp");
}
