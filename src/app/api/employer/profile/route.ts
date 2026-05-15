import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

interface Body {
  employerCompany?: string | null;
  companyWebsite?: string | null;
  companyLogo?: string | null;
  companyIndustry?: string | null;
  companySize?: string | null;
  companyLocation?: string | null;
  companyDescription?: string | null;
  companyFounded?: string | null;
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
  const fields: (keyof Body)[] = [
    "employerCompany", "companyWebsite", "companyLogo", "companyIndustry",
    "companySize", "companyLocation", "companyDescription", "companyFounded",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]?.toString().trim() || null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const user = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({
    ok: true,
    profile: {
      employerCompany: user.employerCompany,
      companyWebsite: user.companyWebsite,
      companyLogo: user.companyLogo,
      companyIndustry: user.companyIndustry,
      companySize: user.companySize,
      companyLocation: user.companyLocation,
      companyDescription: user.companyDescription,
      companyFounded: user.companyFounded,
    },
  });
}
