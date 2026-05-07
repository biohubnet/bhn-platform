/**
 * AI-personalised greeting tagline for the dashboard hero.
 *
 *   GET    /api/greeting       → generate a fresh tagline for this user
 *   POST   /api/greeting       → log like / dislike feedback
 *   PATCH  /api/greeting       → toggle the feature off (or back on)
 *
 * Off-toggle and "last regenerated at" live inside `User.onboarding` JSON
 * so we don't need a schema migration. Feedback is logged as an
 * AIInteraction row (kind="greeting_feedback") so it shows up in the
 * superadmin AI-usage dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chat, AI_CONFIGURED } from "@/lib/ai";
import type { Prisma } from "@prisma/client";

interface GreetingPrefs {
  off?: boolean;
  lastFeedback?: "like" | "dislike" | null;
  lastFeedbackAt?: string;
}

function readGreetingPrefs(onboarding: Prisma.JsonValue | null): GreetingPrefs {
  if (!onboarding || typeof onboarding !== "object" || Array.isArray(onboarding)) return {};
  const ob = onboarding as Record<string, unknown>;
  const g = ob.greeting;
  if (!g || typeof g !== "object" || Array.isArray(g)) return {};
  return g as GreetingPrefs;
}

function writeGreetingPrefs(
  onboarding: Prisma.JsonValue | null,
  next: GreetingPrefs
): Prisma.InputJsonValue {
  const base =
    onboarding && typeof onboarding === "object" && !Array.isArray(onboarding)
      ? { ...(onboarding as Record<string, unknown>) }
      : {};
  base.greeting = next;
  return base as unknown as Prisma.InputJsonValue;
}

const ROLE_FLAVOUR: Record<string, string> = {
  trainee:
    "Welcoming, quietly encouraging. They're here to learn biomanufacturing skills.",
  evaluating:
    "Curious, exploratory. They're trialling the platform before committing.",
  instructor:
    "Collegial, professional. They teach courses and grade assessments.",
  admin:
    "Pragmatic, slightly tongue-in-cheek. They keep the platform running.",
  superadmin:
    "Trusted captain energy — a knowing wink that they hold the keys.",
  employer:
    "Industry-partner tone — concise, business-warm, never patronising.",
};

function fallback(role: string, hour: number): string {
  const partOfDay = hour < 5 ? "the small hours" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const baseByRole: Record<string, string> = {
    trainee: `Glad you're here this ${partOfDay}. One step at a time.`,
    evaluating: `Welcome back this ${partOfDay} — kick the tyres, ask anything.`,
    instructor: `Good ${partOfDay}. Your cohort's in good hands.`,
    admin: `Good ${partOfDay}. Coffee, then the queue.`,
    superadmin: `${partOfDay.charAt(0).toUpperCase() + partOfDay.slice(1)}, captain.`,
    employer: `Good ${partOfDay}. Let's find someone great.`,
  };
  return baseByRole[role] ?? `Good ${partOfDay}.`;
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, role: true, onboarding: true, jobTitle: true, organization: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const prefs = readGreetingPrefs(user.onboarding);
  if (prefs.off) {
    return NextResponse.json({ off: true, text: "" });
  }

  const firstName = user.name?.split(" ")[0] ?? "there";
  const role = user.role ?? "trainee";
  const flavour = ROLE_FLAVOUR[role] ?? ROLE_FLAVOUR.trainee;
  const hour = new Date().getHours();
  const partOfDay = hour < 5 ? "early morning" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "late night";

  // If AI isn't wired up at all, return a friendly canned line.
  if (!AI_CONFIGURED.chat) {
    return NextResponse.json({ off: false, text: fallback(role, hour), source: "fallback" });
  }

  const sys = `You write a single, brief, personalised greeting tagline for a learning-platform dashboard. The tagline appears just under "Hi, {name}." in the hero. It must:
• be ONE short sentence, 8–14 words
• feel warm, witty-but-tasteful, and a touch sincere — not corny
• reference the time of day (it's currently ${partOfDay}) OR a generic motivational angle
• match the user's role — ${flavour}
• avoid emoji, exclamation points (one is fine, more is too many), and clichés ("rock star", "ninja", "let's crush it")
• never reference biology jokes that pun on cells / DNA / lab — they get old
• never include the word "Hi" (already in the headline)
• never wrap the response in quotes or any markdown
• reply with ONLY the tagline, nothing else

Examples (different role / time, just for tone):
• Three coffees in, the catalog is still patient.
• Quiet morning at the lab bench — yours to fill.
• Twenty applicants want a chance. Pick well.`;

  const userMsg = `User: ${firstName}, role ${role}${user.jobTitle ? `, job title "${user.jobTitle}"` : ""}${user.organization ? `, organisation "${user.organization}"` : ""}. Generate the tagline.`;

  const r = await chat(
    [
      { role: "system", content: sys },
      { role: "user", content: userMsg },
    ],
    { feature: "greeting", userId: user.id, maxTokens: 80, temperature: 0.85 }
  );

  if (!r.ok) {
    return NextResponse.json({ off: false, text: fallback(role, hour), source: "fallback" });
  }

  // Sanitise: strip quotes, trim, collapse whitespace, single line.
  let text = r.text.trim().replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, " ");
  // Hard length cap — Llama can sometimes ignore the word count.
  if (text.length > 160) text = text.slice(0, 157) + "…";
  if (!text) text = fallback(role, hour);

  return NextResponse.json({ off: false, text, source: "ai" });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { feedback?: string; text?: string };
  const fb = body.feedback === "like" || body.feedback === "dislike" ? body.feedback : null;
  if (!fb) return NextResponse.json({ error: "feedback must be 'like' or 'dislike'" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, onboarding: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const prefs = readGreetingPrefs(user.onboarding);
  prefs.lastFeedback = fb;
  prefs.lastFeedbackAt = new Date().toISOString();

  // Log feedback in AIInteraction (kind=greeting_feedback) so it shows
  // in the superadmin AI-usage table. errorMessage doubles as the label
  // since success=true (no actual error) — slight abuse, but neat.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { onboarding: writeGreetingPrefs(user.onboarding, prefs) },
    }),
    prisma.aIInteraction.create({
      data: {
        userId: user.id,
        kind: "greeting_feedback",
        provider: "internal",
        model: "feedback",
        success: true,
        errorMessage: `${fb}: ${(body.text ?? "").slice(0, 200)}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, lastFeedback: fb });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { off?: boolean };
  const off = !!body.off;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, onboarding: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const prefs = readGreetingPrefs(user.onboarding);
  prefs.off = off;
  await prisma.user.update({
    where: { id: user.id },
    data: { onboarding: writeGreetingPrefs(user.onboarding, prefs) },
  });
  return NextResponse.json({ ok: true, off });
}
