import Link from "next/link";
import { CalendarX } from "lucide-react";

/**
 * Friendly 404 for /events/[slug] when the slug doesn't match a
 * published BhnEvent. Surfaces when the seed hasn't been run, when
 * an old URL was shared after an event was archived, or when someone
 * typos the slug.
 */
export default function EventNotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-elevated text-subtle flex items-center justify-center mb-5">
        <CalendarX size={28} />
      </div>
      <h1 className="text-2xl font-bold text-fg tracking-tight">Event not found</h1>
      <p className="text-sm text-muted mt-2 leading-snug">
        This event hasn't been published yet, the link is wrong, or the
        event has been archived. Try checking the URL or returning home.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        ← Back to BHN
      </Link>
    </div>
  );
}
