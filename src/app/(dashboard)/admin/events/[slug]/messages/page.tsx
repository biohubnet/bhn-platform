import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Mail, Clock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { BroadcastComposer } from "@/components/admin/events/BroadcastComposer";

export default async function EventMessagesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const { slug } = await params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, title: true },
  });
  if (!event) notFound();

  // Audience counts so the composer's button can show a live preview
  // of "Send to N people" per filter.
  const [allCount, confirmedCount, pendingCount, waitlistCount, checkedInCount, broadcasts] = await Promise.all([
    prisma.registration.count({ where: { eventId: event.id, registrationStatus: { not: "cancelled" } } }),
    prisma.registration.count({ where: { eventId: event.id, registrationStatus: "confirmed" } }),
    prisma.registration.count({ where: { eventId: event.id, registrationStatus: "pending" } }),
    prisma.registration.count({ where: { eventId: event.id, registrationStatus: "waitlist" } }),
    prisma.registration.count({ where: { eventId: event.id, checkedInAt: { not: null }, registrationStatus: { not: "cancelled" } } }),
    prisma.eventBroadcast.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, subject: true, audienceFilter: true,
        recipientCount: true, sentCount: true, sentAt: true, createdAt: true,
        sentBy: { select: { name: true } },
      },
    }),
  ]);
  const counts: Record<string, number> = {
    all: allCount,
    confirmed: confirmedCount,
    pending: pendingCount,
    waitlist: waitlistCount,
    checked_in: checkedInCount,
  };

  return (
    <div>
      <PageHero
        eyebrow={<><Mail size={11} /> Admin · {event.title}</>}
        title="Send a message to attendees"
        description="Compose a one-off email to a slice of your registrants — pre-event reminders, day-of logistics, post-event follow-ups. Recipients see it from info@biohubnet.ca with the event branding."
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 space-y-8">
        <div>
          <Link
            href={`/admin/events/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft size={14} /> Back to event detail
          </Link>
        </div>

        <BroadcastComposer slug={slug} audienceCounts={counts} />

        {broadcasts.length > 0 && (
          <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
            <h2 className="font-bold text-fg text-sm uppercase tracking-[0.18em] text-fg-subtle mb-3 inline-flex items-center gap-2">
              <Clock size={12} /> Recent broadcasts
            </h2>
            <ul className="space-y-2">
              {broadcasts.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 border-t border-line/60 pt-3 first:border-t-0 first:pt-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-fg truncate">{b.subject}</p>
                    <p className="text-xs text-muted mt-0.5">
                      To <span className="font-semibold text-fg">{b.audienceFilter}</span>
                      {" · "}
                      <span className="font-mono tabular-nums">{b.sentCount}/{b.recipientCount}</span>
                      {" sent"}
                      {b.sentAt && <> · {b.sentAt.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>}
                      {b.sentBy?.name && <> · by {b.sentBy.name}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
