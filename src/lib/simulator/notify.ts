/**
 * Simulator request notification helpers.
 *
 * Sends transactional email to the requester when their
 * SimulationRequest changes state into something the user cares
 * about: ready (the sim is published), rejected (admin sent it
 * back), or failed (AI couldn't build it and admin couldn't recover
 * on first try). Pending → generating transitions are NOT notified
 * — those are internal admin progress and don't need to ping the
 * trainee.
 *
 * Channel: SMTP via lib/mail.sendMail. Silently no-ops when SMTP
 * isn't configured (dev / preview deployments without secrets)
 * rather than throwing — never break the admin's save action because
 * the email layer wasn't set up.
 *
 * APP_URL drives the absolute "Play your sim" / "Open the request"
 * links in the email body so the user can click straight into the
 * platform without re-navigating.
 */
import { mailConfigured, sendMail } from "@/lib/mail";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");

function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  if (!APP_URL) return path; // relative fallback in env without APP_URL
  return APP_URL + path;
}

function safeFirstName(name: string | null | undefined): string {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

/** Fire-and-forget wrapper that swallows SMTP failures so the
 *  fulfillment transaction never blows up because email broke. */
async function safeSend(opts: Parameters<typeof sendMail>[0]) {
  if (!mailConfigured()) return;
  try {
    await sendMail(opts);
  } catch (err) {
    // Surface to logs but don't propagate. The user can still see
    // the new status by reloading /simulator.
    console.error("[simulator/notify] sendMail failed:", err);
  }
}

/** Sim went live. Send the requester the link to start playing. */
export async function notifySimReady(args: {
  to: string;
  recipientName: string | null;
  jobTitle: string;
  companyName: string | null;
  attemptId: string;
}): Promise<void> {
  const playUrl = absoluteUrl(`/simulator/${args.attemptId}`);
  const subject = `Your role-play simulation is ready: ${args.jobTitle}`;
  const companyLine = args.companyName ? ` at ${args.companyName}` : "";
  const text =
    `Hi ${safeFirstName(args.recipientName)},\n\n` +
    `Your role-play simulation for ${args.jobTitle}${companyLine} is published and waiting.\n\n` +
    `Twelve weeks of decisions. Five stats. A team of colleagues you'll learn to work with. Try the thing you'd never risk at work.\n\n` +
    `Start week 1: ${playUrl}\n\n` +
    `— BHN Training Platform`;
  const html = `
<p>Hi ${escapeHtml(safeFirstName(args.recipientName))},</p>
<p>Your role-play simulation for <strong>${escapeHtml(args.jobTitle)}</strong>${args.companyName ? ` at <strong>${escapeHtml(args.companyName)}</strong>` : ""} is published and waiting.</p>
<p>Twelve weeks of decisions. Five stats. A team of colleagues you'll learn to work with. Try the thing you'd never risk at work.</p>
<p style="margin: 20px 0;">
  <a href="${playUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">
    ▶ Start week 1
  </a>
</p>
<p style="color:#666;font-size:12px;margin-top:24px;">— BHN Training Platform</p>
`;
  await safeSend({ to: args.to, subject, text, html });
}

/** Admin sent the request back. Surface the reason. */
export async function notifySimRejected(args: {
  to: string;
  recipientName: string | null;
  jdSnippet: string;
  reason: string;
}): Promise<void> {
  const snippet = args.jdSnippet.split("\n").map((l) => l.trim()).find((l) => l) ?? "(your submitted JD)";
  const truncatedSnippet = snippet.length > 100 ? snippet.slice(0, 98) + "…" : snippet;
  const reviewUrl = absoluteUrl("/simulator");
  const subject = `Your sim request needs adjustments`;
  const text =
    `Hi ${safeFirstName(args.recipientName)},\n\n` +
    `An admin reviewed your simulation request — for the posting starting "${truncatedSnippet}" — and sent it back with a note:\n\n` +
    `"${args.reason}"\n\n` +
    `You can revise the JD and resubmit from your dashboard: ${reviewUrl}\n\n` +
    `— BHN Training Platform`;
  const html = `
<p>Hi ${escapeHtml(safeFirstName(args.recipientName))},</p>
<p>An admin reviewed your simulation request — for the posting starting <em>"${escapeHtml(truncatedSnippet)}"</em> — and sent it back with a note:</p>
<blockquote style="border-left:3px solid #f59e0b;padding:8px 14px;background:#fffbeb;color:#78350f;margin:14px 0;">
  ${escapeHtml(args.reason)}
</blockquote>
<p>You can revise the JD and resubmit from your dashboard.</p>
<p style="margin: 20px 0;">
  <a href="${reviewUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">
    Open role-play dashboard
  </a>
</p>
<p style="color:#666;font-size:12px;margin-top:24px;">— BHN Training Platform</p>
`;
  await safeSend({ to: args.to, subject, text, html });
}

/** AI generation failed and admin couldn't recover. */
export async function notifySimFailed(args: {
  to: string;
  recipientName: string | null;
  jdSnippet: string;
  reason: string;
}): Promise<void> {
  const snippet = args.jdSnippet.split("\n").map((l) => l.trim()).find((l) => l) ?? "(your submitted JD)";
  const truncatedSnippet = snippet.length > 100 ? snippet.slice(0, 98) + "…" : snippet;
  const reviewUrl = absoluteUrl("/simulator");
  const subject = `Sim generation hit a snag — we'll retry`;
  const text =
    `Hi ${safeFirstName(args.recipientName)},\n\n` +
    `We hit a snag building your simulation for the posting starting "${truncatedSnippet}". The technical note:\n\n` +
    `"${args.reason}"\n\n` +
    `Our team will retry shortly — usually this resolves within 24 hours. If it doesn't, an admin will reach out directly.\n\n` +
    `Your dashboard: ${reviewUrl}\n\n` +
    `— BHN Training Platform`;
  const html = `
<p>Hi ${escapeHtml(safeFirstName(args.recipientName))},</p>
<p>We hit a snag building your simulation for the posting starting <em>"${escapeHtml(truncatedSnippet)}"</em>. The technical note:</p>
<blockquote style="border-left:3px solid #ef4444;padding:8px 14px;background:#fef2f2;color:#7f1d1d;margin:14px 0;">
  ${escapeHtml(args.reason)}
</blockquote>
<p>Our team will retry shortly — usually this resolves within 24 hours. If it doesn't, an admin will reach out directly.</p>
<p style="margin: 20px 0;">
  <a href="${reviewUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">
    Open role-play dashboard
  </a>
</p>
<p style="color:#666;font-size:12px;margin-top:24px;">— BHN Training Platform</p>
`;
  await safeSend({ to: args.to, subject, text, html });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
