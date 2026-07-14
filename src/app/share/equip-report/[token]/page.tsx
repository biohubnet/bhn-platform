/**
 * Public, no-login view of the EQUIP tracking report dossier.
 *
 * The token model carries the auth — possession of the URL grants read
 * access. There is no session check: the dossier is a self-contained HTML
 * artifact (the same one admins see at /admin/equip/tracker?view=report),
 * rendered here full-bleed inside an isolated <iframe srcDoc>.
 *
 * Missing / revoked tokens 404. Expired tokens render a soft state.
 * `robots: noindex` keeps the dossier out of search engines — it's a
 * shareable but unlisted link, not public web content.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { renderEquipDossierHtml } from "@/lib/equip/dossier";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "EQUIP recipient tracking report",
  robots: { index: false, follow: false },
};

type Ctx = { params: Promise<{ token: string }> };

export default async function SharedEquipReportPage({ params }: Ctx) {
  const { token } = await params;

  const share = await prisma.equipReportShareToken.findUnique({
    where: { token },
    select: { expiresAt: true },
  });
  if (!share) notFound();

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return (
      <main className="min-h-screen bg-page px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-2xl font-bold text-fg">This link has expired.</h1>
          <p className="mt-2 text-fg-muted">
            Ask whoever shared it to send you a fresh link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1014] flex flex-col">
      <iframe
        title="EQUIP Recipient Tracking Report"
        srcDoc={renderEquipDossierHtml({ publicView: true })}
        className="block w-full flex-1"
        style={{ height: "calc(100dvh - 34px)", border: 0 }}
      />
      <footer className="h-[34px] shrink-0 flex items-center justify-center gap-2 bg-[#0d1014] text-[11px] text-white/45 border-t border-white/10">
        <span>Shared read-only preview — no account needed.</span>
        <a href="/" className="text-white/70 hover:text-white underline underline-offset-2">
          BioHubNet
        </a>
      </footer>
    </main>
  );
}
