import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyProfileEditor } from "@/components/employer/CompanyProfileEditor";

export default async function EmployerProfilePage() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "";
  const userId = (session!.user as { id?: string }).id;
  if (role !== "employer" && !["admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          employerCompany: true,
          companyWebsite: true,
          companyLogo: true,
          companyIndustry: true,
          companySize: true,
          companyLocation: true,
          companyDescription: true,
          companyFounded: true,
        },
      })
    : null;

  return (
    <div>
      <Link
        href="/employer"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
      >
        <ArrowLeft size={12} /> Employer overview
      </Link>
      <h1 className="text-2xl font-bold text-fg mb-1">Company profile</h1>
      <p className="text-sm text-muted mb-6 max-w-2xl leading-relaxed">
        Add your website and let the AI fill in your industry, HQ, size, founding year, and a short description. The logo defaults to your site&apos;s favicon — paste a custom URL to override. Trainees see this profile on every internship posting your team makes.
      </p>
      <CompanyProfileEditor initial={user ?? {}} />
    </div>
  );
}
