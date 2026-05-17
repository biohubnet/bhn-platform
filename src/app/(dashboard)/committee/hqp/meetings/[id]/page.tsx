/**
 * /committee/hqp/meetings/[id] — unified meeting page used by
 * both committee members and admins. The client component shows
 * different affordances based on the isAdmin prop.
 */
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { prisma } from "@/lib/prisma";
import { HqpMeetingClient } from "@/components/committee/HqpMeetingClient";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

export default async function HqpMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCommitteeOrAdmin(["hqp"]).catch(() => null);
  if (!session) redirect("/dashboard");
  const userId = (session.user as { id?: string }).id ?? "";
  const role   = (session.user as { role?: string }).role ?? "";
  const isAdmin = role === "admin" || role === "superadmin";
  const { id } = await params;

  const meeting = await prisma.hqpMeeting.findUnique({
    where: { id },
    include: {
      attendance: {
        orderBy: { user: { name: "asc" } },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      actionItems: {
        orderBy: [{ status: "asc" }, { dueOn: "asc" }],
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  });
  if (!meeting) notFound();

  const members = await prisma.committeeMembership.findMany({
    where: { committee: "hqp", active: true },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const meetingDate = meeting.scheduledAt.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <PageHero
        eyebrow={<><Users size={11} /> HQP Advisory Committee · meeting</>}
        title={meeting.title}
        description={`Scheduled for ${meetingDate}.`}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-5">
        <Link href="/committee/hqp" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Back to HQP committee
        </Link>
        <HqpMeetingClient
        meeting={{
          id: meeting.id,
          title: meeting.title,
          scheduledAt: meeting.scheduledAt.toISOString(),
          durationMin: meeting.durationMin,
          agenda: meeting.agenda,
          notes: meeting.notes,
          status: meeting.status,
          meetingUrl: meeting.meetingUrl,
        }}
        attendance={meeting.attendance.map((a) => ({
          id: a.id,
          userId: a.userId,
          status: a.status,
          note: a.note,
          user: a.user,
        }))}
        actionItems={meeting.actionItems.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          assignedToId: a.assignedToId,
          dueOn: a.dueOn?.toISOString() ?? null,
          status: a.status,
          resolutionNote: a.resolutionNote,
          assignedTo: a.assignedTo,
        }))}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        currentUserId={userId}
        isAdmin={isAdmin}
      />
      </div>
    </div>
  );
}
