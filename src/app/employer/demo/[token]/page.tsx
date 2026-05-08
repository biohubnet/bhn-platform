import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Sparkles, Building2, Clock } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { DemoClaimForm } from "@/components/marketing/DemoClaimForm";

export const dynamic = "force-dynamic";

export default async function DemoClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.employerInvite.findUnique({
    where: { token },
    select: {
      id: true, email: true, companyName: true, companyWebsite: true,
      demoMode: true, expiresAt: true, usedAt: true,
    },
  });
  if (!invite || !invite.demoMode) notFound();
  const expired = invite.expiresAt < new Date();
  const used = !!invite.usedAt;

  if (expired || used) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page p-6">
        <div className="max-w-md w-full bg-card border border-line rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <Clock size={20} />
          </div>
          <h1 className="text-xl font-bold text-fg">{expired ? "Demo link expired" : "Already claimed"}</h1>
          <p className="text-sm text-muted mt-2">
            {expired
              ? "This demo link has reached its expiry. Reach out to your BHN contact for a fresh one."
              : "This demo workspace was already started. Sign in with the email and password your contact gave you."}
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold text-sm px-5 py-2.5 rounded-lg"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen has-grain bg-page">
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/for-employers" className="flex items-center gap-3">
          <LogoMark size={32} />
          <div className="leading-tight">
            <p className="font-bold text-fg text-sm">BHN <span className="text-brand-600">Training</span></p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">Demo workspace</p>
          </div>
        </Link>
      </nav>

      <section className="full-bleed relative overflow-hidden text-white -mt-2 hero-mesh-aurora">
        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
            <Sparkles size={11} /> Personalised demo
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mt-4 max-w-2xl mx-auto">
            Welcome — your BHN demo workspace is one click away.
          </h1>
          <p className="mt-5 text-white/85 leading-relaxed max-w-xl mx-auto text-base">
            We&apos;ve set aside a fully populated workspace for <strong className="text-white">{invite.companyName}</strong>: 3 sample postings, 10 applicants spread across the hiring funnel, scheduled interviews, ratings, notes — so you can click around without a single spreadsheet of setup.
          </p>
        </div>
        <div className="curve-down" />
      </section>

      <section className="max-w-md mx-auto px-6 py-12">
        <DemoClaimForm
          token={token}
          email={invite.email}
          companyName={invite.companyName}
          companyWebsite={invite.companyWebsite}
          expiresAt={invite.expiresAt.toISOString()}
        />
      </section>
    </div>
  );
}
