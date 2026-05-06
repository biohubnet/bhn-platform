import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { GroupsClient } from "@/components/admin/GroupsClient";

export default async function AdminGroupsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [groups, users, courses] = await Promise.all([
    prisma.group.findMany({
      include: {
        _count: { select: { members: true, courses: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        courses: {
          include: { course: { select: { id: true, title: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "published" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Groups / Cohorts</h1>
        <p className="text-muted text-sm mt-1">
          Add users and courses to a group — members are auto-enrolled in group courses.
        </p>
      </div>
      <GroupsClient groups={groups} allUsers={users} allCourses={courses} />
    </div>
  );
}
