import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { NewEventForm } from "@/components/admin/events/NewEventForm";
import { PageHero } from "@/components/ui/PageHero";

/**
 * /admin/events/new — create a brand-new BhnEvent.
 *
 * Wraps the NewEventForm in the standard admin chrome. Form submits
 * to POST /api/admin/events and redirects to /admin/events/[slug] on
 * success, where the existing EventBasicsEditor takes over for the
 * long tail of edits.
 *
 * The form is intentionally minimal — slug, title, dates, venue,
 * approval policy. Everything else (cover image, accommodation copy,
 * registration window) is filled in afterward on the detail page.
 * Workshops / sessions / speakers / sponsors are still seed-file-
 * driven until dedicated CRUD UIs ship.
 */
export default async function NewEventPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div>
      <PageHero
        eyebrow={<><Calendar size={11} /> Admin · ENGAGE</>}
        title="Create a new event"
        description="Set up the basics here — title, dates, venue, registration policy. After save you'll land on the event's detail page where you can polish the cover image, accommodation copy, and registration window. Workshops, sessions, speakers, and sponsors are still managed in prisma/seed-events.ts."
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <div className="mb-4">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft size={14} /> Back to all events
          </Link>
        </div>
        <NewEventForm />
      </div>
    </div>
  );
}
