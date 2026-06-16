/** Outreach now has two views — Contacts and Campaigns. Land on Contacts. */
import { redirect } from "next/navigation";

export default function OutreachIndexPage() {
  redirect("/admin/workspace/outreach/contacts");
}
