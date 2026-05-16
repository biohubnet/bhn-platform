/**
 * Admin-only seed/clear pair for /admin/equip.
 *
 *   POST   /api/admin/equip/demo/seed   → create six throwaway
 *                                          applicants + a mix of
 *                                          draft / submitted /
 *                                          under_review / approved /
 *                                          rejected / funded apps
 *   DELETE /api/admin/equip/demo/seed   → wipe the same users
 *                                          (cascading FKs sweep
 *                                           every EquipApplication
 *                                           and Message they own)
 *
 * Mirrors the AutoPipette demo seeder: predictable email pattern
 * (`equip-demo-{slug}@bhn.test`), `accountKind = "demo"`, snapshot
 * data hand-tuned so each section of /admin/equip renders
 * meaningfully even on a fresh deploy.
 */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import type {
  VentureConnectFormData,
  VentureLiftFormData,
  EquipStatus,
  EquipStream,
} from "@/lib/equip/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEMO_EMAIL_PREFIX = "equip-demo-";
const DEMO_EMAIL_SUFFIX = "@bhn.test";

interface DemoUser {
  slug: string;
  name: string;
  organization: string;
  institution: string;
}

const DEMO_USERS: DemoUser[] = [
  { slug: "ayaan",   name: "Ayaan Khan (demo)",   organization: "U of T — Donnelly Centre", institution: "u-of-t" },
  { slug: "lin",     name: "Lin Wei (demo)",      organization: "Queen's — Biochem",        institution: "queens" },
  { slug: "rosa",    name: "Rosa Albright (demo)",organization: "McMaster — IIDR",          institution: "mcmaster" },
  { slug: "dev",     name: "Dev Singh (demo)",    organization: "Waterloo — School of Pharm",institution: "waterloo" },
  { slug: "noor",    name: "Noor Hassan (demo)",  organization: "Western — Schulich",       institution: "western" },
  { slug: "joelle",  name: "Joëlle Tremblay (demo)", organization: "uOttawa — uOttawa Heart",institution: "ottawa" },
];

function emailFor(slug: string): string {
  return `${DEMO_EMAIL_PREFIX}${slug}${DEMO_EMAIL_SUFFIX}`;
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build a realistic VentureConnect form body. */
function vcForm(eventName: string, daysOut: number, budget: number): VentureConnectFormData {
  return {
    eventName,
    eventDate: isoDate(daysAgo(-daysOut)),
    eventUrl: "https://example.org/event",
    alignmentNarrative:
      "We're pitching the protein-purification platform at this event. Two of the panel judges have been at our last poster session and asked for a follow-up; the rest of the audience is a near-perfect ICP for our first paid pilot.",
    budgetRegistration: Math.round(budget * 0.25),
    budgetTravel:       Math.round(budget * 0.45),
    budgetLodging:      Math.round(budget * 0.25),
    budgetOther:        Math.round(budget * 0.05),
    budgetOtherNote:    "Materials and shipping for live demo",
    expectedOutcome:    "Two qualified intros to manufacturing partners + finalist placement",
  };
}

/** Build a realistic VentureLift form body. */
function vlForm(headline: string, trl: number, total: number): VentureLiftFormData {
  return {
    innovationSummary:
      `${headline}\n\nWe combine a cell-free expression system with our affinity-tag platform to bring biologics manufacturing closer to the bench. The IP covers both the tag chemistry (provisional patent filed) and the purification protocol; our prototype processes one liter per run with >85% yield.`,
    ipStatus: trl >= 5 ? "filed" : "provisional",
    ipJurisdiction: "Canada, US (PCT)",
    trl,
    commercializationRoadmap:
      "Month 1: complete pilot validation with two academic partners.\nMonth 2-3: file utility patent, finalize CMC package.\nMonth 4: secure one paid industrial pilot.\nMonth 5-6: spin-out incorporation and seed term-sheet conversations.",
    acceleratorName: "Creative Destruction Lab — Bio Stream",
    acceleratorStart: isoDate(daysAgo(60)),
    acceleratorEnd: isoDate(daysAgo(-120)),
    projectStart: isoDate(daysAgo(-7)),
    projectEnd: isoDate(daysAgo(-170)),
    budgetIp:         Math.round(total * 0.25),
    budgetPrototype:  Math.round(total * 0.35),
    budgetConsulting: Math.round(total * 0.15),
    budgetMarket:     Math.round(total * 0.15),
    budgetOther:      Math.round(total * 0.10),
    budgetOtherNote:  "Conference travel + materials",
    successCriteria:  "Working prototype validated at one paid pilot site + utility patent filed",
  };
}

interface DemoAppSpec {
  stream: EquipStream;
  status: EquipStatus;
  formData: VentureConnectFormData | VentureLiftFormData;
  requestedAmount: number;
  approvedAmount?: number;
  submittedDaysAgo?: number;
  decidedDaysAgo?: number;
  fundedDaysAgo?: number;
  reviewerNote?: string;
  disbursementNote?: string;
  aiAssisted?: boolean;
}

/** Status-per-user matrix so every column on /admin/equip lights up. */
const DEMO_APPS: Record<string, DemoAppSpec> = {
  ayaan:  {
    stream: "venture_connect", status: "submitted",
    formData: vcForm("BIO International Convention 2026", 50, 4900),
    requestedAmount: 4900, submittedDaysAgo: 2,
  },
  lin:    {
    stream: "venture_lift", status: "under_review",
    formData: vlForm("Cell-free biologics manufacturing platform", 5, 24000),
    requestedAmount: 24000, submittedDaysAgo: 5,
    aiAssisted: true,
  },
  rosa:   {
    stream: "venture_connect", status: "approved",
    formData: vcForm("Synthetic Biology Canada 2026", 70, 4500),
    requestedAmount: 4500, approvedAmount: 4500,
    submittedDaysAgo: 14, decidedDaysAgo: 10,
    reviewerNote: "Strong fit. Approved at full requested amount.",
  },
  dev:    {
    stream: "venture_lift", status: "funded",
    formData: vlForm("Continuous-flow protein purification", 6, 23000),
    requestedAmount: 23000, approvedAmount: 22000,
    submittedDaysAgo: 45, decidedDaysAgo: 30, fundedDaysAgo: 21,
    reviewerNote: "Approved at $22K (trimmed Other line). Strong commercialization roadmap.",
    disbursementNote: "EFT-2026-0421 · disbursed 21 days ago",
  },
  noor:   {
    stream: "venture_lift", status: "rejected",
    formData: vlForm("AI-assisted assay optimization", 3, 25000),
    requestedAmount: 25000,
    submittedDaysAgo: 25, decidedDaysAgo: 18,
    reviewerNote: "Encourage to re-apply once TRL ≥ 5 and IP filing is in progress.",
  },
  joelle: {
    stream: "venture_connect", status: "draft",
    formData: vcForm("CardioBio Investor Day", 90, 0),
    requestedAmount: 0,
  },
};

export async function POST() {
  await requireRole("admin");

  let usersCreated = 0;
  let appsCreated = 0;
  const now = new Date();

  for (const demo of DEMO_USERS) {
    const email = emailFor(demo.slug);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: demo.name,
        role: "trainee",
        accountKind: "demo",
        organization: demo.organization,
        jobTitle: "Graduate researcher (demo)",
        country: "Canada",
      },
      update: { organization: demo.organization },
      select: { id: true },
    });
    usersCreated++;

    // Wipe existing apps + their messages for this demo user so
    // re-seeding stays clean.
    await prisma.equipApplication.deleteMany({ where: { userId: user.id } });

    const spec = DEMO_APPS[demo.slug];
    if (!spec) continue;

    const data: Prisma.EquipApplicationCreateInput = {
      user: { connect: { id: user.id } },
      stream: spec.stream,
      status: spec.status,
      applicantType: "grad",
      institution: demo.institution,
      institutionOther: null,
      commercializationStage: spec.stream === "venture_lift" ? "building" : "exploring",
      formData: spec.formData as unknown as Prisma.InputJsonValue,
      requestedAmount: spec.requestedAmount,
      approvedAmount: spec.approvedAmount ?? null,
      reviewerNote: spec.reviewerNote ?? null,
      disbursementNote: spec.disbursementNote ?? null,
      aiAssisted: spec.aiAssisted ?? false,
      submittedAt: spec.submittedDaysAgo !== undefined ? daysAgo(spec.submittedDaysAgo) : null,
      reviewedAt: spec.decidedDaysAgo !== undefined ? daysAgo(spec.decidedDaysAgo) : null,
      decidedAt: spec.decidedDaysAgo !== undefined ? daysAgo(spec.decidedDaysAgo) : null,
      fundedAt: spec.fundedDaysAgo !== undefined ? daysAgo(spec.fundedDaysAgo) : null,
      createdAt: spec.submittedDaysAgo !== undefined ? daysAgo(spec.submittedDaysAgo + 1) : now,
      updatedAt: spec.fundedDaysAgo !== undefined
        ? daysAgo(spec.fundedDaysAgo)
        : spec.decidedDaysAgo !== undefined
          ? daysAgo(spec.decidedDaysAgo)
          : spec.submittedDaysAgo !== undefined
            ? daysAgo(spec.submittedDaysAgo)
            : now,
    };

    const app = await prisma.equipApplication.create({ data, select: { id: true } });
    appsCreated++;

    // Seed a couple of messages on the under_review + approved apps
    // so the thread UI has something to render on first visit.
    if (spec.status === "under_review") {
      await prisma.equipApplicationMessage.create({
        data: {
          applicationId: app.id,
          userId: user.id,
          body: "Happy to clarify any part of the roadmap or budget — let me know what's most useful for your call.",
        },
      });
    }
    if (spec.status === "approved") {
      await prisma.equipApplicationMessage.create({
        data: {
          applicationId: app.id,
          userId: user.id,
          body: "Thank you! Should I confirm the conference registration before disbursement clears?",
        },
      });
    }
  }

  return NextResponse.json({ ok: true, usersCreated, appsCreated });
}

export async function DELETE() {
  await requireRole("admin");

  const users = await prisma.user.findMany({
    where: {
      email: {
        startsWith: DEMO_EMAIL_PREFIX,
        endsWith: DEMO_EMAIL_SUFFIX,
      },
    },
    select: { id: true },
  });
  if (users.length === 0) {
    return NextResponse.json({ ok: true, deletedUsers: 0 });
  }
  const result = await prisma.user.deleteMany({
    where: { id: { in: users.map((u) => u.id) } },
  });
  return NextResponse.json({ ok: true, deletedUsers: result.count });
}
