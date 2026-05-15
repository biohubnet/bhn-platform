import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft, Briefcase, MapPin, Calendar, ClipboardList,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_LABELS, type Stage } from "@/lib/hiring/stages";
import { TraineeAppActions } from "@/components/hiring/TraineeAppActions";

/**
 * /profile/applications/[id] — trainee-side application detail.
 *
 * Shows posting context, current stage, interview slot picker
 * (when an interview is pending), the offer view (when one exists),
 * and a withdraw button. All actions are gated to "the application
 * belongs to me."
 */
export const dynamic = "force-dynamic";

export default async function TraineeApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/profile/applications/${id}`)}`);
  const userId = (session.user as { id?: string }).id ?? null;
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(`/profile/applications/${id}`)}`);

  const app = await prisma.applicationStatus.findUnique({
    where: { id },
    include: {
      posting: {
        select: {
          id: true,
          title: true,
          companyName: true,
          location: true,
          type: true,
          deadline: true,
        },
      },
      offer: true,
    },
  });
  if (!app) notFound();
  if (app.applicantId !== userId) notFound();

  const interview = await prisma.interview.findFirst({
    where: {
      postingId: app.postingId,
      applicantId: app.applicantId,
      status: { in: ["proposed", "accepted"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const stage = (app.status as Stage) ?? "new";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Link
        href="/profile/applications"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> All applications
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          {app.posting.companyName}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2 flex-wrap">
          <Briefcase size={22} className="text-brand-600" />
          {app.posting.title}
          <StageChip stage={stage} />
        </h1>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-2">
          {app.posting.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {app.posting.location}
            </span>
          )}
          {app.posting.type && (
            <span className="inline-flex items-center gap-1">
              <ClipboardList size={11} /> {app.posting.type}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} /> Applied{" "}
            {new Date(app.createdAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}
          </span>
        </dl>
      </header>

      {app.rejectionReason && (stage === "passed" || stage === "withdrawn") && (
        <section className="rounded-2xl bg-rose-50 ring-1 ring-inset ring-rose-200 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-rose-700">
            Outcome note
          </p>
          <p className="text-sm text-rose-900 mt-1 leading-relaxed">
            {app.rejectionReason}
          </p>
        </section>
      )}

      <TraineeAppActions
        applicationStatusId={app.id}
        stage={stage}
        postingId={app.posting.id}
        postingTitle={app.posting.title}
        companyName={app.posting.companyName}
        interview={
          interview
            ? {
                id: interview.id,
                status: interview.status,
                format: interview.format,
                location: interview.location,
                notes: interview.notes,
                proposedSlots: Array.isArray(interview.proposedSlots)
                  ? (interview.proposedSlots as string[])
                  : [],
                acceptedSlot: interview.acceptedSlot?.toISOString() ?? null,
              }
            : null
        }
        offer={
          app.offer && app.offer.status !== "draft"
            ? {
                id: app.offer.id,
                status: app.offer.status,
                body: app.offer.body,
                compensation: app.offer.compensation,
                startDate: app.offer.startDate?.toISOString() ?? null,
                endDate: app.offer.endDate?.toISOString() ?? null,
                hoursPerWeek: app.offer.hoursPerWeek,
                location: app.offer.location,
                acceptDeadline: app.offer.acceptDeadline?.toISOString() ?? null,
                sentAt: app.offer.sentAt?.toISOString() ?? null,
              }
            : null
        }
      />
    </div>
  );
}

function StageChip({ stage }: { stage: Stage }) {
  const tints: Record<string, string> = {
    new: "bg-slate-100 text-slate-700 ring-slate-200",
    reviewing: "bg-blue-100 text-blue-800 ring-blue-200",
    shortlisted: "bg-violet-100 text-violet-800 ring-violet-200",
    interview_scheduled: "bg-amber-100 text-amber-800 ring-amber-200",
    interviewed: "bg-amber-100 text-amber-800 ring-amber-200",
    offer: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    hired: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    passed: "bg-rose-100 text-rose-800 ring-rose-200",
    withdrawn: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[stage] ?? tints.new}`}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
