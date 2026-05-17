import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Calendar } from "lucide-react";
import { InterviewResponseList } from "@/components/lms/InterviewResponseList";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

export default async function MyInterviewsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) redirect("/login");

  const list = await prisma.interview.findMany({
    where: { applicantId: me.id, status: { in: ["proposed", "accepted"] } },
    include: {
      posting: { select: { id: true, title: true, companyName: true } },
      scheduledBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHero
        eyebrow={<><Calendar size={11} /> Schedule</>}
        title="My interviews"
        description="When an employer proposes interview times, they appear here. Pick the one that works, or decline."
      />
      <div className="space-y-6 max-w-3xl mx-auto">

      {/* Admin-only demo seed/clear. Writes Interview rows on the
          viewing admin's own user (applicantId = self), marked with
          [demo] in the notes field. Clear targets exactly that
          marker so real employer-scheduled interviews aren't touched. */}
      {isStaff && (
        <DemoSeedAndClearTray
          entity="user_interview"
          noun="demo interviews"
          clearHelp="Delete Interview rows on your user where notes start with [demo]. Real employer-scheduled interviews are not touched."
        />
      )}

      <InterviewResponseList
        interviews={list.map((i) => ({
          id: i.id,
          status: i.status,
          format: i.format,
          location: i.location,
          notes: i.notes,
          proposedSlots: (i.proposedSlots as string[] | null) ?? [],
          acceptedSlot: i.acceptedSlot ? i.acceptedSlot.toISOString() : null,
          posting: { title: i.posting.title, companyName: i.posting.companyName },
          scheduledByName: i.scheduledBy.name,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
      </div>
    </div>
  );
}
