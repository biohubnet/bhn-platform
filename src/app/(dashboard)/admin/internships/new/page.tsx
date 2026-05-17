import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { InternshipEditor } from "@/components/internships/InternshipEditor";
import { PageHero } from "@/components/ui/PageHero";

export default async function NewInternshipPage() {
  await requireRole("admin");
  return (
    <div>
      <PageHero
        eyebrow={<><Briefcase size={11} /> Admin · EXPERIENCE</>}
        title="New internship posting"
        description="Paste a job description and let the AI fill in the fields, or skip the parser and enter the posting manually."
      />
      <Link
        href="/internships"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft size={12} /> Back to listings
      </Link>
      <InternshipEditor mode="new" />
    </div>
  );
}
