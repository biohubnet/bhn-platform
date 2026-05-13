import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Layers, Award, BookOpen, Users, ClipboardList, Check, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHero } from "@/components/ui/PageHero";
import { EditableText } from "@/components/cms/EditableText";
import { getCopy } from "@/lib/copy";
import { PathwayManageButton } from "@/components/lms/PathwayManageButton";
import { ensureRegisteredForms } from "@/lib/forms/registry";

interface PathwayRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  thumbnail: string | null;
  _count: { courses: number; enrollments: number };
}

export default async function PathwaysPage() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "user";
  const userId = (session!.user as { id?: string }).id!;
  const isStaff = checkIsStaff(role);

  const pathways = await prisma.pathway.findMany({
    where: isStaff ? {} : { status: "published" },
    include: { _count: { select: { courses: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  }) as PathwayRow[];

  const myEnrollments = await prisma.pathwayEnrollment.findMany({
    where: { userId },
    select: { pathwayId: true, status: true },
  });
  const enrollmentMap = new Map(myEnrollments.map((e) => [e.pathwayId, e.status]));

  // First-time deploys won't have any EventForm rows; auto-provision
  // the registered seeds so the cards show up without needing to visit
  // each /forms/[slug] URL individually first.
  await ensureRegisteredForms();

  // Forms with their own home elsewhere shouldn't repeat on Pathways.
  // (Talent Application lives under EXPERIENCE in the sidebar.)
  const FORMS_HIDDEN_FROM_PATHWAYS = ["talent-application"];

  // Registration forms — listed alongside pathways. Inactive forms are
  // staff-only so users don't try to submit something already closed.
  const formRows = await prisma.eventForm.findMany({
    where: {
      ...(isStaff ? {} : { active: true }),
      slug: { notIn: FORMS_HIDDEN_FROM_PATHWAYS },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      active: true,
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const formIds = formRows.map((f) => f.id);
  const mySubmissions = formIds.length
    ? await prisma.eventFormSubmission.findMany({
        where: { userId, formId: { in: formIds } },
        select: { formId: true },
      })
    : [];
  const submittedFormIds = new Set(mySubmissions.map((s) => s.formId));

  // For staff: list of all published courses to attach to pathways
  const courses = isStaff
    ? await prisma.course.findMany({
        select: { id: true, title: true, category: true },
        orderBy: { title: "asc" },
      })
    : [];

  const pathwaysSubtitleDefault = "Stack of courses that ladder up to a single certificate, plus open registrations for live programmes. Pick something to build toward.";
  const pathwaysSubtitle = await getCopy("pathways.subtitle", pathwaysSubtitleDefault);

  return (
    <div>
      <PageHero
        eyebrow={<><Layers size={11} /> Training programmes</>}
        title="Pathways and registrations"
        description={
          <EditableText copyKey="pathways.subtitle" defaultText={pathwaysSubtitle} isStaff={isStaff} />
        }
        actions={isStaff ? <PathwayManageButton mode="create" courses={courses} /> : null}
      />

      {pathways.length === 0 && formRows.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <Layers size={20} />
          </div>
          <p className="font-medium text-muted">No pathways yet</p>
          <p className="text-sm text-muted mt-1">
            {isStaff ? "Create your first pathway to bundle courses into a certified curriculum." : "Check back soon — pathways are coming."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {formRows.map((f) => {
            const submitted = submittedFormIds.has(f.id);
            return (
              <Link
                key={`form-${f.id}`}
                href={`/forms/${f.slug}`}
                className="group bg-card rounded-2xl border border-line hover:border-teal-300 hover:shadow-md transition-all overflow-hidden flex min-h-[180px]"
              >
                {/* Hero panel — full card height */}
                <div className="w-72 shrink-0 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 relative overflow-hidden hidden sm:block">
                  <ClipboardList className="absolute top-5 right-5 text-white/40 z-10 drop-shadow" size={56} />
                  <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.18em] font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20 px-2 py-1 rounded">
                    Registration
                  </span>
                </div>
                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-1.5">
                        Event registration
                      </p>
                      <h3 className="font-semibold text-fg text-lg leading-tight group-hover:text-teal-700 transition-colors">
                        {f.title}
                      </h3>
                    </div>
                    {submitted ? (
                      <Badge tone="success">
                        <Check size={11} className="mr-0.5" /> Submitted
                      </Badge>
                    ) : isStaff && !f.active ? (
                      <Badge tone="warning">Inactive</Badge>
                    ) : null}
                  </div>
                  {f.description && (
                    <p className="text-sm text-muted line-clamp-3 mb-3 leading-relaxed">{f.description}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><ClipboardList size={12} /> Form</span>
                    {isStaff && (
                      <span className="inline-flex items-center gap-1"><Users size={12} /> {f._count.submissions} responses</span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 font-medium text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open form <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          {pathways.map((p) => {
            const myStatus = enrollmentMap.get(p.id);
            return (
              <Link
                key={p.id}
                href={`/pathways/${p.id}`}
                className="group bg-card rounded-2xl border border-line hover:border-brand-300 hover:shadow-md transition-all overflow-hidden flex min-h-[180px]"
              >
                {/* Hero panel — full card height */}
                <div className="w-72 shrink-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 relative overflow-hidden hidden sm:block">
                  {p.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <Layers className="absolute top-5 right-5 text-white/40 z-10 drop-shadow" size={56} />
                  {p.category && (
                    <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.18em] font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20 px-2 py-1 rounded">
                      {p.category}
                    </span>
                  )}
                </div>
                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-1.5">
                        Training pathway
                      </p>
                      <h3 className="font-semibold text-fg text-lg leading-tight group-hover:text-brand-700 transition-colors">
                        {p.title}
                      </h3>
                    </div>
                    {myStatus === "completed" ? (
                      <Badge tone="success">Completed</Badge>
                    ) : myStatus === "approved" ? (
                      <Badge tone="brand">Enrolled</Badge>
                    ) : myStatus === "pending" ? (
                      <Badge tone="amber">Requested</Badge>
                    ) : myStatus === "waitlisted" ? (
                      <Badge tone="warning">Waitlist</Badge>
                    ) : isStaff && p.status === "draft" ? (
                      <Badge tone="warning">Draft</Badge>
                    ) : null}
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted line-clamp-3 mb-3 leading-relaxed">{p.description}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><BookOpen size={12} /> {p._count.courses} courses</span>
                    <span className="inline-flex items-center gap-1"><Users size={12} /> {p._count.enrollments} learners</span>
                    <span className="inline-flex items-center gap-1 text-amber-600"><Award size={12} /> Pathway certificate</span>
                    <span className="ml-auto inline-flex items-center gap-1 font-medium text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      View pathway <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
