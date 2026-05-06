import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Award, Layers, BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PathwayEnrollButton } from "@/components/lms/PathwayEnrollButton";
import { PathwayManageButton } from "@/components/lms/PathwayManageButton";

interface PathwayCourseRow {
  id: string;
  order: number;
  required: boolean;
  course: {
    id: string;
    title: string;
    status: string;
    duration: number | null;
    category: string | null;
  };
}

export default async function PathwayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "user";
  const userId = (session!.user as { id?: string }).id!;
  const isStaff = checkIsStaff(role);

  const pathway = await prisma.pathway.findUnique({
    where: { id },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: { course: { select: { id: true, title: true, status: true, duration: true, category: true } } },
      },
      _count: { select: { enrollments: true, courses: true } },
    },
  });

  if (!pathway) notFound();
  if (!isStaff && pathway.status !== "published") notFound();

  const enrollment = await prisma.pathwayEnrollment.findUnique({
    where: { userId_pathwayId: { userId, pathwayId: id } },
  });

  const courseIds = pathway.courses.map((pc) => pc.courseId);
  const myCourseEnrollments = await prisma.enrollment.findMany({
    where: { userId, courseId: { in: courseIds } },
    select: { courseId: true, status: true, score: true, progress: true },
  });
  const courseStateMap = new Map(myCourseEnrollments.map((e) => [e.courseId, e]));

  const completedCount = myCourseEnrollments.filter((e) => e.status === "completed").length;
  const progress = courseIds.length > 0 ? Math.round((completedCount / courseIds.length) * 100) : 0;

  const certificate = await prisma.certificate.findUnique({
    where: { userId_pathwayId: { userId, pathwayId: id } },
  });

  const allCoursesForEdit = isStaff
    ? await prisma.course.findMany({
        select: { id: true, title: true, category: true },
        orderBy: { title: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white shadow-xl shadow-brand-900/20 px-8 py-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-brand-300/10 rounded-full blur-3xl" />
        <div className="relative flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-brand-200">
                <Layers size={12} /> Training Pathway
              </span>
              {pathway.category && <span className="text-xs bg-white/15 px-2 py-0.5 rounded">{pathway.category}</span>}
              {pathway.status === "draft" && <Badge tone="warning">Draft</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{pathway.title}</h1>
            {pathway.description && (
              <p className="mt-3 text-brand-100 leading-relaxed max-w-2xl">{pathway.description}</p>
            )}
            <div className="mt-5 flex items-center gap-6 text-sm text-brand-100">
              <span className="inline-flex items-center gap-1.5"><BookOpen size={14} />{pathway._count.courses} courses</span>
              <span className="inline-flex items-center gap-1.5"><Award size={14} />Pathway certificate</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            {isStaff && (
              <PathwayManageButton
                mode="edit"
                pathway={{
                  id: pathway.id,
                  title: pathway.title,
                  description: pathway.description,
                  category: pathway.category,
                  status: pathway.status,
                  courseIds: pathway.courses.map((pc) => pc.courseId),
                }}
                courses={allCoursesForEdit}
              />
            )}
            {!isStaff && !enrollment && pathway.status === "published" && (
              <PathwayEnrollButton pathwayId={pathway.id} />
            )}
            {enrollment && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 min-w-[200px]">
                <p className="text-xs text-brand-200 mb-1">Your progress</p>
                <p className="text-2xl font-bold">{progress}%</p>
                <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-brand-100 mt-2">{completedCount}/{courseIds.length} courses complete</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certificate banner */}
      {certificate && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900">Pathway certificate issued</p>
            <p className="text-sm text-amber-800">
              Awarded {new Date(certificate.issueDate).toLocaleDateString()} — view it under Certificates.
            </p>
          </div>
          <Link
            href="/certificates"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
          >
            View →
          </Link>
        </div>
      )}

      {/* Courses checklist */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-semibold text-fg">Courses in this pathway</h2>
          <span className="text-xs text-muted">{completedCount}/{courseIds.length} complete</span>
        </div>
        {pathway.courses.length === 0 ? (
          <div className="p-12 text-center text-sm text-subtle">
            No courses in this pathway yet.
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {(pathway.courses as PathwayCourseRow[]).map((pc, i) => {
              const e = courseStateMap.get(pc.course.id);
              const done = e?.status === "completed";
              const pct = e ? Math.round(e.progress ?? 0) : 0;
              return (
                <li key={pc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-elevated/50">
                  <div className={
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 " +
                    (done
                      ? "bg-emerald-500 text-white"
                      : e
                      ? "bg-brand-100 text-brand-700"
                      : "bg-raised text-muted")
                  }>
                    {done ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/courses/${pc.course.id}`}
                      className="font-medium text-fg hover:text-brand-700 transition-colors"
                    >
                      {pc.course.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      {pc.course.category && <span>{pc.course.category}</span>}
                      {pc.course.duration && (
                        <span className="inline-flex items-center gap-1"><Clock size={11} />{pc.course.duration}m</span>
                      )}
                      {!pc.required && <Badge tone="neutral">Optional</Badge>}
                    </div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    {done ? (
                      <Badge tone="success">Completed</Badge>
                    ) : e ? (
                      <div>
                        <p className="text-xs text-muted mb-1">{pct}%</p>
                        <div className="w-16 h-1.5 bg-raised rounded-full">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <Circle size={16} className="text-subtle ml-auto" />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
