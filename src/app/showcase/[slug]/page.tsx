/**
 * /showcase/[slug] — PUBLIC, no-login graduate-showcase submission page
 * for any admin-created ShowcaseGroup. Mirrors the hand-built
 * /showcase/regulatory-affairs page, but pulls the eyebrow / title /
 * intro from the group row so each group has its own branded link.
 *
 * The original /showcase/regulatory-affairs stays its own static route
 * (static segments win over [slug]), so it's untouched; newly-created
 * groups land here. Lives outside the (dashboard) group — no shell, no
 * auth gate. Pinned to data-theme="light" so the public intake form is
 * brand-consistent regardless of the visitor's theme.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShowcaseSubmitForm } from "@/components/showcase/ShowcaseSubmitForm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

function getGroup(slug: string) {
  return prisma.showcaseGroup.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroup(slug);
  if (!group) return { title: "Showcase · BioHubNet", robots: { index: false } };
  return {
    title: `${group.name} · BioHubNet`,
    description:
      group.intro ??
      "Submit your name, LinkedIn handle, and a headshot to be featured in the BioHubNet showcase.",
    robots: { index: false, follow: false },
  };
}

export default async function ShowcaseGroupPage({ params }: Ctx) {
  const { slug } = await params;
  const group = await getGroup(slug);
  if (!group) notFound();

  return (
    <main
      data-theme="light"
      className="min-h-screen bg-gradient-to-b from-[#f0f7f7] via-[#e6f0f1] to-[#dfecee]"
    >
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <header className="flex flex-col items-center text-center mb-10 sm:mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/biohubnet-logo.png"
            alt="BioHubNet — Transformative Talent Development"
            className="w-full max-w-md h-auto"
          />
        </header>

        <section className="mb-7 text-center">
          {group.eyebrow && (
            <p
              className="text-[10.5px] uppercase tracking-[0.22em] font-bold"
              style={{ color: "#0b6f90" }}
            >
              {group.eyebrow}
            </p>
          )}
          <h2 className="mt-2 text-[24px] sm:text-[30px] font-bold text-fg leading-tight">
            {group.name}
          </h2>
          {group.intro && (
            <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-fg-muted max-w-md mx-auto">
              {group.intro}
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-white shadow-card-rest border border-line/70 px-5 sm:px-7 py-5 sm:py-7">
          {group.active ? (
            <ShowcaseSubmitForm programSlug={group.slug} />
          ) : (
            <div className="text-center py-6">
              <h3 className="text-[16px] font-semibold text-fg">
                Submissions are closed
              </h3>
              <p className="mt-2 text-[13px] text-fg-muted">
                This showcase isn&apos;t accepting new entries right now. Check
                back later, or reach out to the BioHubNet team.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-10 text-center text-[12px] text-fg-muted">
          <p>
            Already submitted? You can resubmit any time — we&apos;ll triage
            duplicates on our side.
          </p>
          <p className="mt-2">Questions? Reach out to the BioHubNet team.</p>
        </footer>
      </div>
    </main>
  );
}
