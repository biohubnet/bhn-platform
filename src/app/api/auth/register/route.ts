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

export async function POST(req: NextRequest) {
  const { name, email, password, newsletter } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const userCount = await prisma.user.count();

  const newsletterStatus = normaliseNewsletter(newsletter);
  const subscribed = newsletterStatus === "subscribe";
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: userCount === 0 ? "superadmin" : "trainee",
      newsletterSubscribed: subscribed,
      newsletterSubscribedAt: subscribed ? new Date() : null,
      newsletterStatus,
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
    props: { newsletterStatus, isFirstUser: userCount === 0 },
  });

  return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
}
