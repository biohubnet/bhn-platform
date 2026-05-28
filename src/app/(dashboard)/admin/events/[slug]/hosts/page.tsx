import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { HostsManager, type HostRow } from "@/components/admin/events/HostsManager";

export default async function EventHostsPage({
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
  const hosts = await prisma.eventHost.findMany({
    where: { eventId: event.id },
    orderBy: { displayOrder: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const rows: HostRow[] = hosts.map((h) => ({
    id: h.id,
    role: h.role,
    displayOrder: h.displayOrder,
    user: h.user,
  }));

  return (
    <div>
      <PageHero
        eyebrow={<><Users size={11} /> Admin · {event.title}</>}
        title="Hosts & co-hosts"
        description="Attribute one or more BHN platform users as hosts of this event. They appear on the public event page under 'Hosted by'. Add hosts by email — they must already have an account."
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        <div>
          <Link
            href={`/admin/events/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft size={14} /> Back to event detail
          </Link>
        </div>
        <HostsManager slug={slug} initial={rows} />
      </div>
    </div>
  );
}
