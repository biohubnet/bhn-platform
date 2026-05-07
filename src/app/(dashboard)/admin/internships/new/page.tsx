import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { InternshipEditor } from "@/components/internships/InternshipEditor";

export default async function NewInternshipPage() {
  await requireRole("admin");
  return (
    <div>
      <Link
        href="/internships"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft size={12} /> Back to listings
      </Link>
      <h1 className="text-2xl font-bold text-fg mb-1">New internship posting</h1>
      <p className="text-sm text-muted mb-6">
        Paste a job description and let the AI fill in the fields, or skip the parser and enter the posting manually.
      </p>
      <InternshipEditor mode="new" />
    </div>
  );
}
