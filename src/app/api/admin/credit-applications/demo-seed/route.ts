/**
 * Admin: seed a small batch of demo CreditApplication rows.
 *
 *   POST /api/admin/credit-applications/demo-seed
 *
 * Mirrors the pattern from /api/admin/events/demo-seed: spawn a few
 * plausible rows so the admin queue has content for screenshots /
 * walkthroughs, and rely on the existing "Clear demo + sandbox"
 * affordance (POST /api/admin/clear-test-data with
 * entity=credit_application) for cleanup. By creating the rows
 * against demo / sandbox account holders we keep the seed + clear
 * pair perfectly symmetric — anything this endpoint inserts gets
 * removed by the Clear button.
 *
 * Bootstrap rule: if the platform has no demo / sandbox users
 * (fresh DB, post-clear test environment), we create a single
 * `demo-credit-apps-{ts}@bhn.test` user with accountKind="demo"
 * so the seed succeeds without external setup. The auto-created
 * user is wiped along with its applications by the standard
 * accountKind-based clear flows.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SAMPLE_APPS: Array<{
  fullName: string;
  organization: string;
  title: string;
  country: string;
  useCase: string;
  status: "pending" | "approved" | "rejected";
  requestedAmount: number;
  approvedAmount?: number;
  reviewerNote?: string;
}> = [
  {
    fullName: "Demo · Priya Iyer",
    organization: "University of Toronto",
    title: "MSc candidate, Pharmaceutical Sciences",
    country: "Canada",
    useCase:
      "Working on a cleanroom gowning thesis project. Need additional credits to enroll in the full Aseptic Technique pathway plus two specialised SCORM simulations the program recommends. ENGAGE eligibility confirmed by supervisor.",
    status: "pending",
    requestedAmount: 4800,
  },
  {
    fullName: "Demo · Marcus Chen",
    organization: "McMaster University",
    title: "PhD candidate, Chemical Engineering",
    country: "Canada",
    useCase:
      "Switching focus to biomanufacturing process design. Have completed two intro modules with starter credits; want to take the full Bioreactor Operations + Quality Systems sequence ahead of an internship interview cycle.",
    status: "approved",
    requestedAmount: 4800,
    approvedAmount: 4800,
    reviewerNote: "Eligibility verified. Approved at request amount.",
  },
  {
    fullName: "Demo · Aisha Okonkwo",
    organization: "Toronto Metropolitan University",
    title: "Undergraduate · Biotechnology, 4th year",
    country: "Canada",
    useCase:
      "Need credits for the Industry-Linked Capstone preparation modules and Workplace Communication for Biomanufacturing. Graduating in spring and applying to Ontario CDMO internships.",
    status: "pending",
    requestedAmount: 3200,
  },
  {
    fullName: "Demo · Jordan Williams",
    organization: "Independent consultant",
    title: "Career transition",
    country: "United States",
    useCase:
      "Career pivot from clinical-trial coordination into manufacturing QA. Not affiliated with one of the 14 BHN partner institutions yet — applying anyway to see if a workshop bundle is approvable on a case-by-case basis.",
    status: "rejected",
    requestedAmount: 4800,
    reviewerNote: "Outside ENGAGE partner-institution criteria. Pointed to workshops + self-pay paths instead.",
  },
];

async function ensureDemoApplicant(): Promise<string> {
  // Prefer an existing demo / sandbox user so the seed maps onto
  // accounts the admin already recognises from other demo flows.
  const existing = await prisma.user.findFirst({
    where: { accountKind: { in: ["demo", "sandbox"] } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.id;

  // Bootstrap path: no demo users on the platform yet. Create one
  // so the seed isn't blocked. accountKind="demo" means the standard
  // clear-test-data flow will reach this row.
  const created = await prisma.user.create({
    data: {
      name: "Demo Applicant",
      email: `demo-credit-apps-${Date.now()}@bhn.test`,
      role: "trainee",
      accountKind: "demo",
      credits: 200,
      emailVerified: new Date(),
    },
    select: { id: true },
  });
  return created.id;
}

export async function POST() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reviewerId = (session.user as { id?: string }).id ?? null;

  let created = 0;
  for (const app of SAMPLE_APPS) {
    const userId = await ensureDemoApplicant();
    const now = new Date();
    await prisma.creditApplication.create({
      data: {
        userId,
        fullName: app.fullName,
        organization: app.organization,
        title: app.title,
        country: app.country,
        useCase: app.useCase,
        status: app.status,
        requestedAmount: app.requestedAmount,
        approvedAmount: app.status === "approved" ? app.approvedAmount ?? app.requestedAmount : null,
        reviewerId: app.status !== "pending" ? reviewerId : null,
        reviewerNote: app.reviewerNote ?? null,
        reviewedAt: app.status !== "pending" ? now : null,
        documents: [],
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
