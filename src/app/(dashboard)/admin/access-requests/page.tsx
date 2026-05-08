import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Inbox } from "lucide-react";
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
      <header>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Inbox size={20} className="text-brand-600" />
          Access requests
        </h1>
        <p className="text-sm text-muted mt-1">
          Submissions from the public /for-employers and /for-trainees pages. Approve to mint an invite, or reject if it&apos;s not a fit.
        </p>
      </header>

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
