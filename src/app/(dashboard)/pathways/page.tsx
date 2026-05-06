import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Layers, Award, BookOpen, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PathwayManageButton } from "@/components/lms/PathwayManageButton";

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

  // For staff: list of all published courses to attach to pathways
  const courses = isStaff
    ? await prisma.course.findMany({
        select: { id: true, title: true, category: true },
        orderBy: { title: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Training Pathways"
        description="Curated course collections that culminate in a single certificate."
        actions={isStaff ? <PathwayManageButton mode="create" courses={courses} /> : null}
      />

      {pathways.length === 0 ? (
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pathways.map((p) => {
            const myStatus = enrollmentMap.get(p.id);
            return (
              <Link
                key={p.id}
                href={`/pathways/${p.id}`}
                className="group bg-card rounded-2xl border border-line hover:border-brand-300 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="h-28 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 relative">
                  <Layers className="absolute top-4 right-4 text-white/30" size={48} />
                  {p.category && (
                    <span className="absolute top-3 left-3 text-xs bg-white/15 backdrop-blur-sm text-white border border-white/20 px-2 py-0.5 rounded">
                      {p.category}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-fg leading-tight group-hover:text-brand-700 transition-colors">
                      {p.title}
                    </h3>
                    {myStatus === "completed" ? (
                      <Badge tone="success">Completed</Badge>
                    ) : myStatus === "active" ? (
                      <Badge tone="brand">Enrolled</Badge>
                    ) : isStaff && p.status === "draft" ? (
                      <Badge tone="warning">Draft</Badge>
                    ) : null}
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted line-clamp-2 mb-4">{p.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><BookOpen size={12} /> {p._count.courses} courses</span>
                    <span className="inline-flex items-center gap-1"><Users size={12} /> {p._count.enrollments} learners</span>
                    <span className="inline-flex items-center gap-1 ml-auto text-amber-600"><Award size={12} /> Certified</span>
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
