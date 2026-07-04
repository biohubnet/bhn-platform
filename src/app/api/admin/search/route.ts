import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAlgoliaClient, ALGOLIA_INDEX } from "@/lib/algolia";

/**
 * Global admin search — one box, three entities, backed by Algolia
 * (see scripts/algolia-sync.ts for the indexing job that keeps
 * bhn_users / bhn_courses / bhn_postings in sync with Postgres).
 */
const RESULTS_PER_TYPE = 5;

interface UserHit { objectID: string; name: string | null; email: string; role: string }
interface CourseHit { objectID: string; title: string; code: string | null }
interface PostingHit { objectID: string; title: string; companyName: string }

export async function GET(req: NextRequest) {
  await requireRole("admin");

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [], courses: [], postings: [] });
  }

  const client = getAlgoliaClient();
  const { results } = await client.search({
    requests: [
      { indexName: ALGOLIA_INDEX.users, query: q, hitsPerPage: RESULTS_PER_TYPE },
      { indexName: ALGOLIA_INDEX.courses, query: q, hitsPerPage: RESULTS_PER_TYPE },
      { indexName: ALGOLIA_INDEX.postings, query: q, hitsPerPage: RESULTS_PER_TYPE },
    ],
  });

  const [userResult, courseResult, postingResult] = results as {
    hits: unknown[];
  }[];
  const users = userResult.hits as UserHit[];
  const courses = courseResult.hits as CourseHit[];
  const postings = postingResult.hits as PostingHit[];

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.objectID,
      title: u.name || u.email,
      subtitle: u.name ? `${u.email} · ${u.role}` : u.role,
      href: `/admin/users?kind=real&q=${encodeURIComponent(u.email)}`,
    })),
    courses: courses.map((c) => ({
      id: c.objectID,
      title: c.title,
      subtitle: c.code ?? undefined,
      href: `/courses/${c.objectID}`,
    })),
    postings: postings.map((p) => ({
      id: p.objectID,
      title: p.title,
      subtitle: p.companyName,
      href: `/admin/internships/${p.objectID}/edit`,
    })),
  });
}
