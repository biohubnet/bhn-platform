/**
 * POST /api/showcase/submit
 *
 * PUBLIC endpoint (no auth) — accepts a graduate showcase
 * submission: name + linkedin handle + headshot file. Validates,
 * uploads the photo to R2, persists a ShowcaseSubmission row.
 *
 * Body: multipart/form-data with fields:
 *   programSlug  string (default "regulatory-affairs")
 *   name         string (required, 2-120 chars)
 *   linkedin     string (required, 2-200 chars — raw user input,
 *                normalised to a canonical URL server-side)
 *   photo        File   (required, image/* under 5 MB)
 *
 * Returns: { ok: true, id } on success, { error } on failure.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { putR2Object, r2PublicUrl, R2_PUBLIC_URL } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;  // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_PROGRAMS = new Set(["regulatory-affairs"]);

/** Normalise whatever the user typed into a canonical
 *  https://www.linkedin.com/in/<slug>/ URL. Handles:
 *   • "foo"                              → linkedin.com/in/foo
 *   • "linkedin.com/in/foo"              → https://linkedin.com/in/foo
 *   • "https://www.linkedin.com/in/foo/" → kept as-is
 *  Returns null when we can't extract a plausible slug. */
function normaliseLinkedin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Already a URL with /in/ — keep it.
  try {
    const u = new URL(trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`);
    if (u.hostname.endsWith("linkedin.com")) {
      // Make sure the path looks like /in/<something>
      const m = u.pathname.match(/^\/in\/([^/?#]+)/i);
      if (m) return `https://www.linkedin.com/in/${m[1]}/`;
      return null;
    }
  } catch { /* not a URL — fall through */ }
  // Bare slug — accept alphanumeric + dashes + dots.
  const m = trimmed.match(/^[A-Za-z0-9\-._]{2,100}$/);
  if (m) return `https://www.linkedin.com/in/${trimmed}/`;
  return null;
}

export async function POST(req: NextRequest) {
  if (!R2_PUBLIC_URL) {
    return NextResponse.json(
      { error: "Server isn't configured to accept uploads. Contact us." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't parse form data." }, { status: 400 });
  }

  const programSlug = String(formData.get("programSlug") ?? "regulatory-affairs").trim();
  const name = String(formData.get("name") ?? "").trim();
  const linkedinRaw = String(formData.get("linkedin") ?? "").trim();
  const photo = formData.get("photo");

  // Validate text fields.
  if (!ALLOWED_PROGRAMS.has(programSlug)) {
    return NextResponse.json({ error: "Unknown program." }, { status: 400 });
  }
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Name should be 2–120 characters." }, { status: 400 });
  }
  if (linkedinRaw.length < 2 || linkedinRaw.length > 200) {
    return NextResponse.json({ error: "Add your LinkedIn handle (2–200 characters)." }, { status: 400 });
  }
  const linkedinUrl = normaliseLinkedin(linkedinRaw);
  if (!linkedinUrl) {
    return NextResponse.json({
      error: "That LinkedIn handle doesn't look right. Try a URL like linkedin.com/in/yourname or just the slug 'yourname'.",
    }, { status: 400 });
  }

  // Validate file.
  if (!photo || !(photo instanceof File)) {
    return NextResponse.json({ error: "Headshot file is required." }, { status: 400 });
  }
  if (photo.size === 0) {
    return NextResponse.json({ error: "Photo file is empty." }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: `Photo must be under 5 MB. Yours is ${(photo.size / 1024 / 1024).toFixed(1)} MB.` }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(photo.type)) {
    return NextResponse.json({ error: `Photo must be JPEG, PNG, or WebP. Yours is ${photo.type || "an unknown type"}.` }, { status: 400 });
  }

  // Derive a safe extension.
  const ext = photo.type === "image/png" ? "png"
            : photo.type === "image/webp" ? "webp"
            : "jpg";

  // Use the row id we're about to create as the R2 key so each
  // photo's URL is stable + we can find / delete it later. Two-
  // pass: create the row first (without photoUrl), upload, then
  // patch — but that's two writes. Cleaner: generate the id via
  // crypto + create + upload in parallel, then write the row.
  const { randomUUID } = await import("crypto");
  const id = `cm${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const photoKey = `showcase/${programSlug}/${id}.${ext}`;

  try {
    const buf = Buffer.from(await photo.arrayBuffer());
    await putR2Object(photoKey, buf, photo.type);
  } catch (err) {
    console.error("[showcase] R2 upload failed:", err);
    return NextResponse.json({ error: "Photo upload failed. Try again." }, { status: 502 });
  }

  // Capture IP + UA for abuse triage. Vercel injects the real
  // origin IP into x-forwarded-for / x-real-ip headers.
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = (xff.split(",")[0] || req.headers.get("x-real-ip") || "").trim() || null;
  const ua = req.headers.get("user-agent");

  try {
    await prisma.showcaseSubmission.create({
      data: {
        id,
        programSlug,
        name,
        linkedinHandle: linkedinRaw,
        linkedinUrl,
        photoUrl: r2PublicUrl(photoKey),
        photoKey,
        submittedFromIp: ip,
        submittedFromUa: ua,
      },
    });
  } catch (err) {
    console.error("[showcase] DB insert failed:", err);
    // Best-effort: try to clean up the uploaded photo so we don't
    // leak orphaned objects. Ignored on error.
    try {
      const { deleteR2ObjectByUrl } = await import("@/lib/r2");
      await deleteR2ObjectByUrl(photoKey);
    } catch { /* swallow */ }
    return NextResponse.json({ error: "Couldn't save your submission. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
