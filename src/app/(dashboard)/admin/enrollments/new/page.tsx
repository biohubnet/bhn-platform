import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewEnrollmentForm, type UserOption, type CourseOption } from "@/components/admin/NewEnrollmentForm";

/**
 * /admin/enrollments/new — full-page workflow for creating one or
 * more course enrollments. Replaces the prior popup modal.
 *
 * Two working modes (the client form lets the admin flip between
 * them):
 *
 *   • One user → many courses    — bulk-onboard a new trainee
 *     (search a user, multi-select courses, optional shared due
 *     date). Most common admin path.
 *
 *   • CSV import (existing)      — many users × many courses in one
 *     paste. The client form embeds the previous CSV importer so
 *     admins don't lose that capability.
 *
 * SSR fetches the candidate users + published courses; the client
 * form handles search, selection, and POSTs to /api/admin/enrollments
 * one row at a time (same endpoint the popup used, so server-side
 * contract is unchanged).
 */
export default async function AdminNewEnrollmentPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [users, courses] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, email: true, role: true, accountKind: true,
        organization: true, credits: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "published" },
      select: {
        id: true, title: true, category: true, creditCost: true, duration: true,
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const userOptions: UserOption[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    accountKind: u.accountKind,
    organization: u.organization,
    credits: u.credits,
  }));
  const courseOptions: CourseOption[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    creditCost: c.creditCost,
    duration: c.duration,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href="/admin/enrollments"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Enrollment overview
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Admin · Engage · New enrollment
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Plus size={22} className="text-brand-600" />
          Create enrollment(s)
        </h1>
        <p className="text-sm text-muted mt-2 leading-snug max-w-3xl">
          Enroll one trainee in one or more published courses. Admin
          enrollments don't deduct credits — the trainee can take any
          chosen course regardless of their balance.{" "}
          <Link href="/admin/pathway-enrollments" className="text-brand-700 font-semibold hover:underline">
            Pathway enrollments
          </Link>{" "}
          are managed separately because they often need eligibility
          review first.
        </p>
      </header>

      <NewEnrollmentForm users={userOptions} courses={courseOptions} />
    </div>
  );
}
