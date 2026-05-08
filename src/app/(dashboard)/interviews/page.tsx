import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Calendar } from "lucide-react";
import { InterviewResponseList } from "@/components/lms/InterviewResponseList";

export const dynamic = "force-dynamic";

export default async function MyInterviewsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
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
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Calendar size={20} className="text-brand-600" />
          My interviews
        </h1>
        <p className="text-sm text-muted mt-1">
          When an employer proposes interview times, they appear here. Pick the one that works, or decline.
        </p>
      </header>

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
  );
}
