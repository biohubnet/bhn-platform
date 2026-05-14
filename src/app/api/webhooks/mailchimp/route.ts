/**
 * Mailchimp webhook receiver — keeps the BHN side in sync with
 * Mailchimp-side state changes (DOI confirmations, unsubscribes,
 * bounces, email-address changes).
 *
 * Setup (Mailchimp side)
 *   Audience → Settings → Webhooks → "Create new webhook":
 *     URL: https://<your-domain>/api/webhooks/mailchimp?secret=<MAILCHIMP_WEBHOOK_SECRET>
 *     Events: Subscribes, Unsubscribes, Cleaned addresses, Email
 *             address changes. Skip "Campaign sent" + "Profile
 *             updates" — they're noisy and we don't care.
 *     Sources: API + User (manual subscribe via admin UI).
 *
 * Security
 *   Mailchimp doesn't sign webhooks. The standard pattern is to put
 *   a secret token in the URL itself (server-side, never logged).
 *   The first thing Mailchimp does when you create the webhook is
 *   issue a HEAD/GET to verify the URL — we 200 those so the setup
 *   form can confirm.
 *
 * Payload
 *   Mailchimp sends application/x-www-form-urlencoded, NOT JSON.
 *   Fields look like:
 *     type=unsubscribe
 *     fired_at=2026-05-14 16:00:00
 *     data[email]=user@example.com
 *     data[id]=<member id (md5 of email)>
 *     ...
 *   We URL-decode and use type + data[email] / data[new_email] to
 *   route the event.
 *
 * Idempotence
 *   Every handler does a single targeted update with the email as
 *   the natural key — re-delivering the same event is safe.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
// Mailchimp tests the URL with both GET (during setup) and POST.
// Force-dynamic so we always see the live secret query string.
export const dynamic = "force-dynamic";

function checkSecret(req: NextRequest): boolean {
  const expected = process.env.MAILCHIMP_WEBHOOK_SECRET?.trim();
  if (!expected) return false; // Fail closed when the secret isn't set.
  const provided = new URL(req.url).searchParams.get("secret");
  return provided === expected;
}

/** Mailchimp's setup ping is a GET; respond 200 so the form lets the
 *  admin save the webhook. Still gated on the secret so a passer-by
 *  can't enumerate the route. */
export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ping: "mailchimp-webhook" });
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Mailchimp posts form-urlencoded. URLSearchParams handles the
  // nested data[email]= shape cleanly.
  const text = await req.text();
  const params = new URLSearchParams(text);
  const type = params.get("type");
  const email = params.get("data[email]")?.trim().toLowerCase() ?? null;
  const newEmail = params.get("data[new_email]")?.trim().toLowerCase() ?? null;
  const memberId = params.get("data[id]") ?? null;

  if (!type) {
    return NextResponse.json({ ok: false, error: "missing event type" }, { status: 400 });
  }

  const now = new Date();

  // Dispatch by Mailchimp event type. We don't care about "campaign"
  // or "profile" events — they don't change subscription state.
  try {
    switch (type) {
      case "subscribe": {
        if (!email) break;
        await prisma.user.updateMany({
          where: { email },
          data: {
            newsletterStatus: "subscribe",
            newsletterSubscribed: true,
            newsletterSubscribedAt: now,
            mailchimpStatus: "subscribed",
            mailchimpMemberId: memberId,
            mailchimpSyncedAt: now,
          },
        });
        break;
      }
      case "unsubscribe": {
        if (!email) break;
        await prisma.user.updateMany({
          where: { email },
          data: {
            newsletterStatus: "no",
            newsletterSubscribed: false,
            mailchimpStatus: "unsubscribed",
            mailchimpSyncedAt: now,
          },
        });
        break;
      }
      case "cleaned": {
        // Mailchimp scrubbed the address (bounce / spam complaint).
        // Reflect the cleaned state without changing user intent.
        if (!email) break;
        await prisma.user.updateMany({
          where: { email },
          data: {
            mailchimpStatus: "cleaned",
            mailchimpSyncedAt: now,
          },
        });
        break;
      }
      case "upemail": {
        // User changed their email inside Mailchimp. Keep the BHN
        // record pointing at the new address only if it's not already
        // taken by a different account — collisions would create FK
        // duplication that we'd rather notice in audit than auto-fix.
        if (!email || !newEmail) break;
        const collision = await prisma.user.findFirst({
          where: { email: newEmail },
          select: { id: true },
        });
        if (!collision) {
          await prisma.user.updateMany({
            where: { email },
            data: { email: newEmail, mailchimpSyncedAt: now },
          });
        }
        break;
      }
      default:
        // Unknown event — accept (200) so Mailchimp doesn't retry, but
        // record nothing. We deliberately accept unknown types so adding
        // a new Mailchimp event doesn't trip our queue retry budget.
        break;
    }
  } catch (err) {
    // Surface in server logs but return 200 — re-delivering the same
    // event won't help if our DB is mis-shaped; the admin needs to
    // see this in monitoring.
    console.error("[mailchimp-webhook]", type, email, err);
  }

  return NextResponse.json({ ok: true });
}
