import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AnnouncementsClient } from "@/components/admin/AnnouncementsClient";

export default async function AdminAnnouncementsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [announcements, courses] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
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
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-500 text-sm mt-1">Post platform-wide or course-scoped announcements.</p>
      </div>
      <AnnouncementsClient announcements={announcements} courses={courses} />
    </div>
  );
}
