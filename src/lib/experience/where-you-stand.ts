/**
 * The EXPERIENCE column's numbers for one trainee: how often employers
 * have opened their resume and their video, in total, interviews
 * completed, and open postings.
 *
 * "Resume" counts both the structured resume page and the uploaded file;
 * "video" is the one-minute video introduction, the only recording an
 * employer can watch today.
 */
import { prisma } from "@/lib/prisma";
import { torontoToday } from "@/lib/dashboard-promos";

export async function getExperienceStanding(userId: string, now = new Date()) {
  // InternshipPosting.deadline is a calendar day (UTC midnight); a
  // posting stays listed through its deadline day.
  const today = torontoToday(now);
  const [resumeViews, videoViews, interviewsDone, postings] = await Promise.all([
    prisma.profileView.count({
      where: { userId, surface: { in: ["resume", "resume_file", "talent_pool", "applicant"] } },
    }),
    prisma.profileView.count({ where: { userId, surface: "video_intro" } }),
    // `completed` is only set when the employer scores the interview, so
    // an accepted slot that is already in the past counts as done too.
    prisma.interview.count({
      where: { applicantId: userId, OR: [{ status: "completed" }, { status: "accepted", acceptedSlot: { lt: now } }] },
    }),
    // Nothing moves a posting to "expired" when its deadline passes, so
    // filter on the deadline as well; demo postings never count.
    prisma.internshipPosting.findMany({
      where: { status: "active", isDemoSeed: false, OR: [{ deadline: null }, { deadline: { gte: today } }] },
      orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 3,
      select: { id: true, title: true, companyName: true, location: true, deadline: true },
    }),
  ]);
  return { resumeViews, videoViews, interviewsDone, postings };
}
