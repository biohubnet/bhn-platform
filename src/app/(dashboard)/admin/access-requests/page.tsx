import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Inbox } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { AccessRequestsClient } from "@/components/admin/AccessRequestsClient";

export const dynamic = "force-dynamic";

export default async function AccessRequestsPage() {
  await requireRole("admin");

  const requests = await prisma.accessRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Inbox size={11} /> Admin · Platform</>}
        title="Access requests"
        description="Submissions from the public /for-employers and /for-trainees pages. Approve to mint an invite, or reject if it's not a fit."
      />

      <AccessRequestsClient
        initial={requests.map((r) => ({
          id: r.id,
          kind: r.kind,
          email: r.email,
          name: r.name,
          company: r.company,
          website: r.website,
          message: r.message,
          source: r.source,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
