/**
 * Bulk-invite mint for employer HRs. Admin pastes a list of emails
 * (one per line, comma- or semicolon-separated also accepted) and
 * we mint a magic-link invite per address. Returns per-row outcomes
 * so the UI can show "minted X · skipped Y · invalid Z".
 *
 *   POST /api/admin/employer-invites/bulk
 *   { emails: string, companyName?: string, expiresInDays?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

function newToken() {
  return randomBytes(32).toString("hex");
}

interface RowResult {
  email: string;
  ok: boolean;
  reason?: string;
  inviteId?: string;
  token?: string;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    emails?: string;
    companyName?: string;
    expiresInDays?: number;
  };
  const raw = (body.emails ?? "").trim();
  if (!raw) {
    return NextResponse.json({ error: "Paste at least one email." }, { status: 400 });
  }
  // Accept newline / comma / semicolon separated. Trim, lowercase, dedupe.
  const candidates = Array.from(new Set(
    raw.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  )).slice(0, 100); // Cap at 100 per call so we don't hammer the DB.

  const days = Math.max(1, Math.min(60, body.expiresInDays ?? 14));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const userId = (session.user as { id?: string }).id ?? null;

  const results: RowResult[] = [];
  const created: { id: string }[] = [];

  for (const email of candidates) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      results.push({ email, ok: false, reason: "malformed" });
      continue;
    }
    try {
      const invite = await prisma.employerInvite.create({
        data: {
          email,
          token: newToken(),
          companyName: body.companyName?.trim() || null,
          invitedById: userId,
          expiresAt,
        },
      });
      results.push({ email, ok: true, inviteId: invite.id, token: invite.token });
      created.push({ id: invite.id });
    } catch (e) {
      results.push({ email, ok: false, reason: (e as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    minted: created.length,
    invalid: results.filter((r) => !r.ok && r.reason === "malformed").length,
    failed:  results.filter((r) => !r.ok && r.reason !== "malformed").length,
    results,
  });
}
