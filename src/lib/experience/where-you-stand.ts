/**
 * The EXPERIENCE column's numbers for one trainee: employer profile
 * views over a rolling window, interviews done, and open postings.
 */
import { prisma } from "@/lib/prisma";
import { torontoToday } from "@/lib/dashboard-promos";

export const PROFILE_VIEW_WINDOW_DAYS = 30;

export async function getExperienceStanding(userId: string, now = new Date()) {
  // ProfileView.day and InternshipPosting.deadline are calendar days
  // (UTC midnight). The views window includes today, and a posting stays
  // listed through its deadline day.
  const today = torontoToday(now);
  const since = new Date(today.getTime() - (PROFILE_VIEW_WINDOW_DAYS - 1) * 86_400_000);
  const [profileViews, interviewsDone, postings] = await Promise.all([
    prisma.profileView.count({ where: { userId, day: { gte: since } } }),
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
  return { profileViews, interviewsDone, postings, windowDays: PROFILE_VIEW_WINDOW_DAYS };
}
