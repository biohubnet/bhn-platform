import Link from "next/link";
import { Building2, FilePlus, Users2, Video, Bookmark, CalendarClock, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";

/** Employer portal landing page — overview tiles + recent activity. */
export default async function EmployerHome() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  if (role !== "employer" && !["admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const myUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { employerCompany: true },
      })
    : null;

  // Live counts for the overview tiles. Queries are lightweight; the
  // real ATS workflow lives one click deeper.
  const [postingsCount, applicantsCount] = await Promise.all([
    prisma.internshipPosting.count({ where: { createdById: userId ?? "_" } }),
    prisma.eventFormSubmission.count({
      where: { form: { slug: "talent-application" } },
    }),
  ]);

  return (
    <div>
      <PageHero
        eyebrow={<><Building2 size={11} /> Employer portal</>}
        title={myUser?.employerCompany ?? "Employer overview"}
        description="Post internship opportunities, review talent applications, watch one-minute video introductions, save promising candidates, and book interviews — all from this portal."
        tone="brand"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Tile
          href="/employer/postings"
          icon={FilePlus}
          eyebrow="Postings"
          headline={`${postingsCount} active`}
          body="Manage the internships your company has posted on the BioHubNet job board."
        />
        <Tile
          href="/employer/applicants"
          icon={Users2}
          eyebrow="Applicants"
          headline={`${applicantsCount} on file`}
          body="Browse talent applications, filter by skills and citizenship, and shortlist candidates."
        />
        <Tile
          href="/employer/applicants?has=video"
          icon={Video}
          eyebrow="One-minute videos"
          headline="Watch & evaluate"
          body="Review the STAR video introductions submitted by candidates."
        />
      </div>

      <div className="mt-8 bg-card border border-line rounded-2xl p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-3">Coming next</p>
        <ul className="text-sm text-muted space-y-2 leading-relaxed">
          <li className="flex items-start gap-2"><Bookmark size={14} className="mt-0.5 text-brand-600" /> Save resumes for later — saved candidates are pinned to your portal.</li>
          <li className="flex items-start gap-2"><Users2 size={14} className="mt-0.5 text-brand-600" /> Shortlist with notes. Each candidate gets a status (Saved / Shortlisted / Interviewing / Hired / Passed) you can move them through.</li>
          <li className="flex items-start gap-2"><CalendarClock size={14} className="mt-0.5 text-brand-600" /> Book interviews — share availability via Calendly or BioHubNet's own scheduler.</li>
        </ul>
      </div>
    </div>
  );
}

function Tile({
  href, icon: Icon, eyebrow, headline, body,
}: {
  href: string;
  icon: React.ElementType;
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-card border border-line rounded-2xl p-5 hover:border-brand-300 hover:shadow-md transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{eyebrow}</p>
      <p className="text-lg font-semibold text-fg mt-1">{headline}</p>
      <p className="text-sm text-muted mt-2 leading-relaxed">{body}</p>
      <p className="mt-4 text-xs font-medium text-brand-700 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowRight size={11} />
      </p>
    </Link>
  );
}
