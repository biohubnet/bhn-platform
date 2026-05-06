import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangeLogClient } from "@/components/lms/ChangeLogClient";

export default async function ChangeLogPage() {
  const session = await getSession();
  const role = ((session!.user as { role?: string }).role ?? "trainee") as string;
  const lookupRole = role === "user" ? "trainee" : role;
  const trainee = role === "trainee" || role === "user" || role === "evaluating";
  const canManage = isAdmin(role);

  const entries = await prisma.changeLog.findMany({
    where: { visibleTo: { has: lookupRole } },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title={trainee ? "What's new" : "Change log"}
        description={
          trainee
            ? "Recent improvements and updates to the BHN Training Platform."
            : "Release notes for the BHN Training Platform. Visibility per entry is configurable."
        }
      />

      <ChangeLogClient
        entries={entries.map((e) => ({
          ...e,
          publishedAt: e.publishedAt.toISOString(),
        }))}
        canManage={canManage}
      />
    </div>
  );
}
