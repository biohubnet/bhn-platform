/**
 * Admin email smoke-test. Sends a one-off message via the configured SMTP
 * transport so an admin can confirm outbound email works after setting the
 * SMTP_* env vars — without waiting for a real verification/notification.
 *   POST /api/admin/test-email  body: { to?: string }  (defaults to caller)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sendMail, mailConfigured } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!mailConfigured()) {
    return NextResponse.json(
      { error: "SMTP isn't configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, then redeploy." },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { to?: string };
  const fallback = (session.user as { email?: string }).email ?? "";
  const to = (body.to ?? fallback).trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "Enter a valid recipient address." }, { status: 400 });
  }

  try {
    await sendMail({
      to,
      subject: "BHN Training — test email ✅",
      text: "This is a test email from the BHN Training platform. If you received it, outbound SMTP is working.",
      html:
        `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1f2428">` +
        `<h2 style="margin:0 0 8px">✅ SMTP is working</h2>` +
        `<p>This is a test email from the <strong>BHN Training</strong> platform. If you received it, outbound email is configured correctly.</p>` +
        `<p style="color:#6b7280;font-size:13px;margin-top:16px">Sent from Admin → System status · ${new Date().toUTCString()}</p>` +
        `</div>`,
    });
    return NextResponse.json({ ok: true, to });
  } catch (e) {
    // Surface the transport error verbatim — it's the most useful thing for
    // debugging a misconfigured host/port/credential.
    return NextResponse.json({ error: (e as Error).message || "Send failed." }, { status: 502 });
  }
}
