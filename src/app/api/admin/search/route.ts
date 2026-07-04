import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Global admin search — one box, three entities. Not a search product:
 * plain Postgres `contains` (case-insensitive) across the handful of
 * fields an admin actually looks someone/something up by. At this
 * platform's scale (dozens to low thousands of rows per table) this is
 * as fast as it needs to be; if a table ever grows into the hundreds of
 * thousands, add a `pg_trgm` index before reaching for an external
 * search service — same database, no new vendor.
 */
const RESULTS_PER_TYPE = 5;

export async function GET(req: NextRequest) {
  await requireRole("admin");

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [], courses: [], postings: [] });
  }

  const [users, courses, postings] = await Promise.all([
    prisma.user.findMany({
      where: {
        accountKind: "real",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, role: true },
      take: RESULTS_PER_TYPE,
    }),
    prisma.course.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, code: true },
      take: RESULTS_PER_TYPE,
    }),
    prisma.internshipPosting.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, companyName: true },
      take: RESULTS_PER_TYPE,
    }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      title: u.name || u.email,
      subtitle: u.name ? `${u.email} · ${u.role}` : u.role,
      href: `/admin/users?kind=real&q=${encodeURIComponent(u.email)}`,
    })),
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.code ?? undefined,
      href: `/courses/${c.id}`,
    })),
    postings: postings.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.companyName,
      href: `/admin/internships/${p.id}/edit`,
    })),
  });
}
