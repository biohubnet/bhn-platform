import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { trackServer } from "@/lib/analytics";

/**
 * Newsletter intent at signup. Tri-state:
 *   "subscribe" — opt in (default in the form)
 *   "no"        — not interested
 *   "already"   — user is already on the BioHubNet list (don't double-add)
 */
type NewsletterStatus = "subscribe" | "no" | "already";

function normaliseNewsletter(input: unknown): NewsletterStatus {
  if (input === "subscribe" || input === "no" || input === "already") return input;
  // Back-compat: older clients still post a boolean.
  if (input === true)  return "subscribe";
  if (input === false) return "no";
  return "subscribe";
}

const SUPPORTED_LOCALES = ["en", "es", "fr", "zh", "hi", "ko", "pa", "ar"];

const VALID_JOB_TITLES = [
  "Master's student",
  "PhD candidate",
  "Postdoctoral Fellow",
  "Research Associate",
  "Lab Technician",
  "Industry Professional",
  "Other",
] as const;

export async function POST(req: NextRequest) {
  const { name, email, password, newsletter, jobTitle, locale } = await req.json();

  // ── Validation ──────────────────────────────────────────────────
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) {
    return NextResponse.json({ error: "Name is required (2–80 characters)." }, { status: 400 });
  }
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const userCount = await prisma.user.count();

  const newsletterStatus = normaliseNewsletter(newsletter);
  const subscribed = newsletterStatus === "subscribe";

  // Optional fields with sane fallbacks
  const cleanLocale = typeof locale === "string" && SUPPORTED_LOCALES.includes(locale)
    ? locale
    : "en";
  const cleanJobTitle = typeof jobTitle === "string"
    && (VALID_JOB_TITLES as readonly string[]).includes(jobTitle)
    ? jobTitle
    : null;

  const user = await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      password: hashed,
      role: userCount === 0 ? "superadmin" : "trainee",
      newsletterSubscribed: subscribed,
      newsletterSubscribedAt: subscribed ? new Date() : null,
      newsletterStatus,
      locale: cleanLocale,
      jobTitle: cleanJobTitle,
    },
  });

  // TODO: when a real ESP (Mailchimp / MailerLite / etc.) is wired in,
  // enqueue a subscription job here for `email` IF newsletterStatus ===
  // "subscribe". For now we record intent and the admin exports the
  // list manually from /admin/newsletter.

  await trackServer({
    userId: user.id,
    role: user.role,
    name: "register",
    props: { newsletterStatus, isFirstUser: userCount === 0, hasJobTitle: !!cleanJobTitle, locale: cleanLocale },
  });

  return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
}
