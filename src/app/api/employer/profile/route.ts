import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { parseCompanyBrand } from "@/lib/employer/brand";

export const runtime = "nodejs";

interface Body {
  employerCompany?: string | null;
  companyWebsite?: string | null;
  companyLogo?: string | null;
  companyLogoShape?: string | null;
  /** Pan + zoom transform JSON: { offsetX, offsetY, scale }. null
   *  clears the transform. */
  companyLogoTransform?: unknown;
  /** Brand tokens JSON: { primary?, secondary?, accent?, style? }.
   *  null clears the brand back to platform default. */
  companyBrand?: unknown;
  companyIndustry?: string | null;
  companySize?: string | null;
  companyMainBusiness?: string | null;
  companyTicker?: string | null;
  companyLocation?: string | null;
  companyDescription?: string | null;
  companyFounded?: string | null;
}

const ALLOWED_LOGO_SHAPES = new Set(["", "circle", "rounded", "square", "natural"]);

/** Validate the pan+zoom blob from the client. Returns the
 *  normalised JSON value, or `null` to mean "clear", or `false` if
 *  the input is malformed (so the caller can 400). */
function parseLogoTransformInput(raw: unknown): { ok: true; value: object | null } | { ok: false } {
  if (raw === null) return { ok: true, value: null };
  if (raw === undefined) return { ok: false }; // treated by caller as "no field"
  if (typeof raw !== "object") return { ok: false };
  const o = raw as Record<string, unknown>;
  const x = typeof o.offsetX === "number" ? o.offsetX : 0;
  const y = typeof o.offsetY === "number" ? o.offsetY : 0;
  const s = typeof o.scale === "number" ? o.scale : 1;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(s)) {
    return { ok: false };
  }
  // Clamp scale to a sane range so a bad input can't blow up
  // downstream renderers.
  const safe = { offsetX: x, offsetY: y, scale: Math.min(Math.max(s, 0.1), 8) };
  return { ok: true, value: safe };
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const userId = (session?.user as { id?: string })?.id;
  // Admins and superadmins also reach the employer profile page (via
  // view-as / direct visit) and must be able to save edits on their
  // own user record. The auto-fill sibling endpoint already allows
  // both; this one was inconsistent and produced a "Forbidden"
  // toast on save.
  if (!session || !userId || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const data: Record<string, unknown> = {};
  const fields: Exclude<keyof Body, "companyLogoTransform">[] = [
    "employerCompany", "companyWebsite", "companyLogo", "companyLogoShape",
    "companyIndustry", "companySize", "companyLocation", "companyDescription",
    "companyFounded", "companyMainBusiness", "companyTicker",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const raw = body[f]?.toString().trim() || null;
      // Validate the logo shape so a malformed value can't sneak
      // through and break the CSS mask lookup in the renderer.
      if (f === "companyLogoShape" && raw !== null && !ALLOWED_LOGO_SHAPES.has(raw)) {
        return NextResponse.json(
          { error: `Invalid companyLogoShape "${raw}"` },
          { status: 400 },
        );
      }
      data[f] = raw;
    }
  }
  // companyLogoTransform is a JSON blob — needs its own validation +
  // a Prisma.JsonNull / Prisma.DbNull dance for explicit clearing.
  if ("companyLogoTransform" in body) {
    const parsed = parseLogoTransformInput(body.companyLogoTransform);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Invalid companyLogoTransform" },
        { status: 400 },
      );
    }
    // Use Prisma.DbNull so a null value actually writes NULL to the
    // JSON column (literal null leaves the field unchanged).
    data.companyLogoTransform = parsed.value === null
      ? Prisma.DbNull
      : (parsed.value as Prisma.InputJsonValue);
  }

  // companyBrand — same JSON-with-explicit-null treatment.
  if ("companyBrand" in body) {
    if (body.companyBrand === null) {
      data.companyBrand = Prisma.DbNull;
    } else {
      const parsed = parseCompanyBrand(body.companyBrand);
      if (parsed === null) {
        // Empty or invalid → clear the row.
        data.companyBrand = Prisma.DbNull;
      } else {
        data.companyBrand = parsed as unknown as Prisma.InputJsonValue;
      }
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const user = await prisma.user.update({ where: { id: userId }, data });

  // Invalidate the server-rendered employer surfaces so the next
  // navigation / refresh sees the new profile values. Without this,
  // Next.js can serve a stale RSC payload after save and the page
  // looks broken ("page can't be loaded" on some browsers when the
  // soft-refresh RSC fetch returns inconsistent data).
  revalidatePath("/employer");
  revalidatePath("/employer/profile");

  return NextResponse.json({
    ok: true,
    profile: {
      employerCompany: user.employerCompany,
      companyWebsite: user.companyWebsite,
      companyLogo: user.companyLogo,
      companyLogoShape: user.companyLogoShape,
      companyLogoTransform: user.companyLogoTransform,
      companyBrand: user.companyBrand,
      companyIndustry: user.companyIndustry,
      companySize: user.companySize,
      companyLocation: user.companyLocation,
      companyDescription: user.companyDescription,
      companyFounded: user.companyFounded,
      companyMainBusiness: user.companyMainBusiness,
      companyTicker: user.companyTicker,
    },
  });
}
