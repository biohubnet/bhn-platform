import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LtiConfigClient } from "@/components/admin/LtiConfigClient";

export default async function AdminLtiPage() {
  const session = await requireRole("superadmin").catch(() => null);
  if (!session) redirect("/admin");

  const configs = await prisma.ltiConfig.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">LTI 1.3 Platform Configurations</h1>
        <p className="text-muted text-sm mt-1">
          Connect external LMS platforms via LTI 1.3. Superadmin only.
        </p>
      </div>
      <LtiConfigClient configs={configs} />
    </div>
  );
}
