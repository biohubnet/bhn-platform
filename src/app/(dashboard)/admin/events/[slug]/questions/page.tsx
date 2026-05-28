import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import {
  CustomQuestionsManager,
  type QuestionRow,
} from "@/components/admin/events/CustomQuestionsManager";

/**
 * /admin/events/[slug]/questions — manage the custom registration
 * questions that appear on the public registration form below the
 * standard fields.
 *
 * Loads the current set server-side, hands them to the client
 * component for the add/edit/delete UI.
 */
export default async function EventQuestionsPage({
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

  const questions = await prisma.customRegQuestion.findMany({
    where: { eventId: event.id },
    orderBy: { displayOrder: "asc" },
  });

  // Prisma returns options as Prisma.JsonValue — cast through unknown
  // to the strict client-side shape; the API validates on the way in.
  const rows: QuestionRow[] = questions.map((q) => ({
    id: q.id,
    key: q.key,
    label: q.label,
    hint: q.hint,
    kind: q.kind as QuestionRow["kind"],
    options: q.options as unknown as QuestionRow["options"],
    required: q.required,
    displayOrder: q.displayOrder,
  }));

  return (
    <div>
      <PageHero
        eyebrow={<><Calendar size={11} /> Admin · {event.title}</>}
        title="Custom registration questions"
        description="Add up to as many questions as you need — text inputs, single/multi choice, or yes/no. These appear on the public registration form below the standard fields, and answers show up in the admin attendee detail page + the CSV export."
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <div className="mb-4">
          <Link
            href={`/admin/events/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft size={14} /> Back to event detail
          </Link>
        </div>
        <CustomQuestionsManager slug={slug} initial={rows} />
      </div>
    </div>
  );
}
