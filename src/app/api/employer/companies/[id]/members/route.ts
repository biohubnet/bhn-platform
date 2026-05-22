/**
 * GET  /api/employer/companies/[id]/members
 *   Returns the full member list for the company.
 *   Requires: viewer+ on the company.
 *
 * POST /api/employer/companies/[id]/members/invite
 *   (handled here as POST with body.action="invite" — see below)
 *
 * POST /api/employer/companies/[id]/members
 *   Bulk invite endpoint. Accepts a list of { email, role, title?, note? }
 *   objects and fires one CompanyInvite + email per entry.
 *   Requires: manager+ (owner+ for role="owner").
 *
 *   Body:
 *   {
 *     invites: Array<{
 *       email:   string;
 *       role:    "owner"|"manager"|"generalist"|"viewer";
 *       title?:  string;
 *       note?:   string;
 *     }>
 *   }
 *
 *   Returns: { sent: number; skipped: Array<{email, reason}> }
 *   Skipped entries: already a member, already a pending invite, or
 *   the caller lacks the tier to invite at the requested role.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireCompanyRole, meetsMinRole, type CompanyRole } from "@/lib/employer/company";
import { writeEmployerAction } from "@/lib/employer/activity";
import { sendMail, mailConfigured } from "@/lib/mail";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const INVITE_EXPIRY_DAYS = 7;
const VALID_ROLES = new Set(["owner", "manager", "generalist", "viewer"]);

// ── GET — member list ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: companyId } = await params;

  try {
    await requireCompanyRole(companyId, userId, "viewer");
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const members = await prisma.companyMember.findMany({
    where: { companyId },
    select: {
      id:         true,
      role:       true,
      title:      true,
      joinedAt:   true,
      lastSeenAt: true,
      user: {
        select: {
          id:    true,
          name:  true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  // Also return pending invites so the UI can show "invited" chips.
  const pendingInvites = await prisma.companyInvite.findMany({
    where: { companyId, status: "pending", expiresAt: { gt: new Date() } },
    select: {
      id:        true,
      email:     true,
      role:      true,
      title:     true,
      createdAt: true,
      expiresAt: true,
      invitedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ members, pendingInvites });
}

// ── POST — bulk invite ────────────────────────────────────────────

interface InviteEntry {
  email: string;
  role:  string;
  title?: string;
  note?:  string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: companyId } = await params;

  let callerRole: CompanyRole;
  try {
    const result = await requireCompanyRole(companyId, userId, "manager");
    callerRole = result.role;
  } catch {
    return NextResponse.json({ error: "Access denied — manager+ required" }, { status: 403 });
  }

  let body: { invites?: InviteEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.invites) || body.invites.length === 0) {
    return NextResponse.json({ error: "invites array required" }, { status: 400 });
  }
  if (body.invites.length > 50) {
    return NextResponse.json({ error: "Maximum 50 invites per request" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const sent: string[] = [];
  const skipped: Array<{ email: string; reason: string }> = [];
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000);

  for (const entry of body.invites) {
    const email = entry.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skipped.push({ email: entry.email ?? "(blank)", reason: "Invalid email" });
      continue;
    }

    const role = entry.role as CompanyRole;
    if (!VALID_ROLES.has(role)) {
      skipped.push({ email, reason: `Invalid role: ${entry.role}` });
      continue;
    }

    // Caller can't invite at a higher tier than their own.
    if (!meetsMinRole(callerRole, role)) {
      skipped.push({ email, reason: `Your role cannot invite ${role}s` });
      continue;
    }

    // Only owners can invite other owners.
    if (role === "owner" && callerRole !== "owner") {
      skipped.push({ email, reason: "Only Owners can invite other Owners" });
      continue;
    }

    // Already a member?
    const existingMember = await prisma.companyMember.findFirst({
      where: { companyId, user: { email } },
      select: { id: true },
    });
    if (existingMember) {
      skipped.push({ email, reason: "Already a member" });
      continue;
    }

    // Already a pending invite?
    const existingInvite = await prisma.companyInvite.findFirst({
      where: { companyId, email, status: "pending", expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (existingInvite) {
      skipped.push({ email, reason: "Already invited (pending)" });
      continue;
    }

    // Create the invite.
    const token = randomBytes(32).toString("hex");
    const invite = await prisma.companyInvite.create({
      data: {
        companyId,
        email,
        role,
        title:       entry.title ?? null,
        token,
        invitedById: userId,
        note:        entry.note ?? null,
        status:      "pending",
        expiresAt,
      },
    });

    // Fire the invite email.
    const acceptUrl = `${process.env.NEXTAUTH_URL ?? "https://app.biohubnet.ca"}/invite/${token}`;
    const callerName = caller?.name ?? caller?.email ?? "A teammate";
    const noteBlock = entry.note ? `\n\nPersonal note from ${callerName}:\n"${entry.note}"` : "";

    if (mailConfigured()) {
      await sendMail({
        to:      email,
        subject: `You've been invited to join ${company.name} on BHN Training`,
        text: `Hi,

${callerName} has invited you to join ${company.name} on the BHN Training Platform as a ${role}.${noteBlock}

Click the link below to accept your invitation:
${acceptUrl}

This link expires in ${INVITE_EXPIRY_DAYS} days.

If you didn't expect this invitation, you can ignore this email.

— BHN Training Platform`,
        html: `
<p>${callerName} has invited you to join <strong>${company.name}</strong> on the BHN Training Platform as a <strong>${role}</strong>.</p>
${entry.note ? `<blockquote style="border-left:3px solid #ccc;margin:16px 0;padding:8px 16px;color:#555">${entry.note}</blockquote>` : ""}
<p><a href="${acceptUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:6px">Accept invitation</a></p>
<p style="color:#888;font-size:12px">This link expires in ${INVITE_EXPIRY_DAYS} days. If you didn't expect this invitation, you can ignore this email.</p>`,
      }).catch(() => {/* don't fail the invite if email bounces */});
    }

    // Activity log for the invite.
    await writeEmployerAction({
      kind:        "member_invited",
      companyId,
      actorId:     userId,
      payload:     { targetEmail: email, targetName: entry.title ?? email, role },
      targetUserId: null,
    }).catch(() => {/* non-critical */});

    sent.push(invite.id);
  }

  return NextResponse.json({ sent: sent.length, skipped });
}
