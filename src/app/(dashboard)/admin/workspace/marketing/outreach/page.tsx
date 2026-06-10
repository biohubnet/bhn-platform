/** Outreach moved up a level — keep old bookmarks working. */
import { redirect } from "next/navigation";

export default function OutreachMovedPage() {
  redirect("/admin/workspace/outreach");
}
