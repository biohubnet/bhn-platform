/**
 * PUBLIC employer-intake endpoint — no login required.
 *
 * The "Hire an intern" form on biohubnet.ca (built with Codex) POSTs here.
 * Because it's called cross-origin from a different site, this route sets CORS
 * headers and answers the OPTIONS preflight. Spam is mitigated with a honeypot
 * field and an optional Cloudflare Turnstile token (verified when present).
 *
 * Contract (keep stable — the external page depends on it):
 *   POST application/json
 *   { name, email, organization, title?, website?, address?,
 *     hiring_timeline?, needs?, company_url?(honeypot), turnstileToken? }
 *   → 200 { ok: true }
 *   → 400 { ok: false, error }   (validation)
 *   → 429 { ok: false, error }   (rejected as spam)
 *
 * Submissions are stored as EventFormSubmission rows (form slug
 * "employer-intake") and surface in Admin → Experience → Employer intake.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrSeedForm } from "@/lib/forms/registry";
import { verifyTurnstile } from "@/lib/security/captcha";

export const runtime = "nodejs";

// Origins allowed to POST cross-site. Add your production domain(s) here.
const ALLOWED_ORIGINS = new Set([
  "https://biohubnet.ca",
  "https://www.biohubnet.ca",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://biohubnet.ca";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

const BodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("A valid email is required").max(320),
  organization: z.string().trim().max(300).optional().default(""),
  title: z.string().trim().max(200).optional().default(""),
  website: z.string().trim().max(500).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  hiring_timeline: z.string().trim().max(100).optional().default(""),
  needs: z.string().trim().max(2000).optional().default(""),
  // Honeypot — real users never fill this; bots tend to.
  company_url: z.string().optional().default(""),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));
  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400, headers: cors },
    );
  }
  const b = parsed.data;

  // Honeypot tripped → pretend success so bots don't learn anything.
  if (b.company_url.trim()) {
    return NextResponse.json({ ok: true }, { status: 200, headers: cors });
  }

  // Optional Turnstile — only enforced if a token is supplied AND the secret is
  // configured. Lets the external page work without the widget, but verifies it
  // when present.
  if (b.turnstileToken && process.env.TURNSTILE_SECRET_KEY) {
    const result = await verifyTurnstile(
      b.turnstileToken,
      req.headers.get("x-forwarded-for") ?? undefined,
    ).catch(() => ({ ok: false }));
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "Verification failed." }, { status: 429, headers: cors });
    }
  }

  const form = await getOrSeedForm("employer-intake");
  if (!form) {
    return NextResponse.json({ ok: false, error: "Form unavailable." }, { status: 500, headers: cors });
  }

  await prisma.eventFormSubmission.create({
    data: {
      formId: form.id,
      userId: null,
      email: b.email.toLowerCase(),
      reviewStatus: "pending",
      data: {
        name: b.name,
        email: b.email,
        organization: b.organization,
        title: b.title,
        website: b.website,
        address: b.address,
        hiring_timeline: b.hiring_timeline,
        needs: b.needs,
        source: "hire-an-intern",
      },
    },
  });

  return NextResponse.json({ ok: true }, { status: 200, headers: cors });
}
