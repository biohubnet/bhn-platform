import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnalyticsClient } from "@/components/admin/AnalyticsClient";

export default async function AdminAnalyticsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="User activity, growth, and engagement — for product decisions and reporting."
      />
      <AnalyticsClient />
    </div>
  );
}
