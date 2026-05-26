/**
 * /admin/announcements — platform-wide + course-scoped announcements.
 *
 * Hero owns the top (platform rule). The seed/clear tray sits
 * immediately under the hero so admins can populate the queue with
 * three plausible demo rows (one pinned, one platform-wide, one
 * course-scoped) before walking a stakeholder through the surface,
 * and reverse the seed in one click.
 */
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnnouncementsClient } from "@/components/admin/AnnouncementsClient";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

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
    <div className="space-y-5">
      {/*
        Gradient-washed hero — matches the visual identity used on
        /admin/equip/deadlines. PageHeader carries the icon + title +
        description; a thin brand-tinted hairline below the copy acts
        as the "this is the chrome, content starts now" beat.
      */}
      <section
        className="rounded-2xl border border-line/70 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--brand-50) 60%, var(--card)) 0%, var(--card) 70%)",
        }}
      >
        <div className="px-5 sm:px-7 py-5 sm:py-6">
          <PageHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Megaphone size={22} className="text-brand-600" />
                Announcements
              </span>
            }
            description="Post platform-wide or course-scoped announcements. Pinned items surface on the trainee dashboard; course-scoped items appear inside the relevant course shell. Real announcements stay live until you delete them."
          />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-brand-200/70 to-transparent" />
      </section>

      {/* Seed / clear tray — sits below the hero per platform rule
          ("hero owns the top"). Seed drops three demo announcements
          (one pinned, one platform-wide, one course-scoped) authored
          under the admin's own user id but with [demo] title prefix;
          Clear removes every announcement whose title starts with
          [demo]. Real rows (no prefix) are never touched. */}
      <DemoSeedAndClearTray
        entity="announcement"
        noun="demo announcements"
        clearHelp="Delete every announcement whose title begins with [demo]. Real announcements you've posted (no prefix) are not touched."
      />

      <AnnouncementsClient announcements={announcements} courses={courses} />
    </div>
  );
}
