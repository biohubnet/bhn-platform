/**
 * POST /api/employer/profile/logo-search
 *
 * Run logo discovery on a company's homepage and return ALL ranked
 * candidates (not just the top one). The Edit Profile modal calls
 * this when the operator clicks "Find logo from website" — instead
 * of the auto-fill endpoint's one-best behaviour, this lets the
 * operator pick from a short list.
 *
 * Body shape: { website: string }
 * Response:
 *   {
 *     ok: true,
 *     best: string | null,         // top candidate by score
 *     candidates: { url, source, score }[],  // sorted best-first
 *     favicon: string,             // Google-favicons last-resort
 *   }
 *
 * Persists nothing. Pick-and-save is the modal's job.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  fetchHomepageHtml,
  discoverLogoCandidates,
  faviconFallback,
} from "@/lib/employer/logo-discovery";

export const runtime = "nodejs";
export const maxDuration = 20;

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  if (!session || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { website?: string };
  const url = normalizeUrl(body.website ?? "");
  if (!url) {
    return NextResponse.json({ error: "Enter a valid company website." }, { status: 400 });
  }

  const html = await fetchHomepageHtml(url);
  // Keep the top 6 — more than that and the picker grid gets noisy
  // and we'd just be showing increasingly desperate guesses.
  const candidates = discoverLogoCandidates(html, url).slice(0, 6);
  const favicon = faviconFallback(url.hostname);

  return NextResponse.json({
    ok: true,
    best: candidates[0]?.url ?? null,
    candidates,
    favicon,
  });
}
