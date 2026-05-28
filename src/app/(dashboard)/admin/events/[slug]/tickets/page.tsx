import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Ticket } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { stripeConfigured } from "@/lib/stripe";
import {
  TicketTypesManager,
  type TicketTypeRow,
} from "@/components/admin/events/TicketTypesManager";

export default async function EventTicketsPage({
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
  const tickets = await prisma.ticketType.findMany({
    where: { eventId: event.id },
    orderBy: { displayOrder: "asc" },
  });
  const rows: TicketTypeRow[] = tickets.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    priceCents: t.priceCents,
    currency: t.currency,
    capacity: t.capacity,
    isActive: t.isActive,
    displayOrder: t.displayOrder,
  }));

  return (
    <div>
      <PageHero
        eyebrow={<><Ticket size={11} /> Admin · {event.title}</>}
        title="Ticket tiers"
        description="Define one or more bookable tiers (Standard $40, Student $20, etc.) for paid checkout via Stripe. Free ($0) tiers always work without Stripe. Buyers pick a tier on the registration form, get redirected to Stripe Checkout, and are confirmed automatically when payment lands."
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        <div>
          <Link
            href={`/admin/events/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft size={14} /> Back to event detail
          </Link>
        </div>
        <TicketTypesManager
          slug={slug}
          initial={rows}
          stripeConfigured={stripeConfigured()}
        />
      </div>
    </div>
  );
}
