/**
 * /profile/master/snapshots/[id]/print — print-friendly view of a
 * master-resume snapshot.
 *
 * The snapshot's `content` column is already a ResumeContent tree
 * (shaped by `shapeBulletsAsContent` at snapshot time), so we hand it
 * straight to the same ResumePrintView that the active-resume preview
 * page uses. That keeps a single source of truth for the print
 * layout — anything we change there shows up here for free.
 *
 * PDF strategy. The platform has no server-side PDF renderer
 * (puppeteer / chromium aren't installed, and adding them is a
 * deploy-surface decision). For now the "download as PDF" path
 * redirects here with ?autoPrint=1 so the user's browser opens its
 * own print dialog with "Save as PDF" pre-selected as the destination.
 * Trade-off: light browser-to-browser variation in the output; gain:
 * zero new dependencies and zero new deploy surface. See
 * docs/plans/master-resume.md for the longer note.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyResumeContent, type ResumeContent } from "@/lib/resume/types";
import { ResumePrintView } from "@/components/profile/ResumePrintView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoPrint?: string }>;
}

/** Slugify the same way the download route does, so the print page's
 *  <title> matches the JSON download's filename. The browser's
 *  "Save as PDF" dialog defaults the filename to document.title on
 *  every modern browser — so a sensible title means a sensible
 *  default filename. Worth syncing the two slug rules. */
function slugify(s: string): string {
  return (s || "user")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "user";
}

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const session = await getSession();
  const userId = session ? (session.user as { id?: string }).id : null;
  if (!userId) return { title: "Master resume" };
  const { id } = await params;
  const snap = await prisma.masterSnapshot.findFirst({
    where: { id, master: { userId } },
    select: {
      versionNumber: true,
      createdAt: true,
      content: true,
    },
  });
  if (!snap) return { title: "Master resume" };
  const contentObj = snap.content as Record<string, unknown> | null;
  const header = contentObj && typeof contentObj === "object" && "header" in contentObj
    ? (contentObj.header as Record<string, unknown> | undefined)
    : undefined;
  const sessionName = (session?.user as { name?: string } | undefined)?.name ?? "user";
  const name = typeof header?.name === "string" && header.name ? (header.name as string) : sessionName;
  return {
    title: `master-resume_${slugify(name)}_v${snap.versionNumber}_${isoDate(snap.createdAt)}`,
  };
}

export default async function MasterSnapshotPrintPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  const { id } = await params;
  if (!session) redirect(`/login?callbackUrl=/profile/master/snapshots/${id}/print`);
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const { autoPrint } = await searchParams;

  // Ownership: the snapshot's master must belong to the caller.
  const snapshot = await prisma.masterSnapshot.findFirst({
    where: { id, master: { userId } },
    select: {
      id: true,
      versionNumber: true,
      name: true,
      createdAt: true,
      content: true,
    },
  });
  if (!snapshot) {
    // 404 redirect — fall back to the deep page rather than rendering
    // a half-broken print sheet.
    redirect("/profile/master");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // The snapshot's content was written via shapeBulletsAsContent and
  // is a ResumeContent JSON tree. Cast through unknown — we trust the
  // shape because we wrote it.
  const content = (snapshot.content as unknown as ResumeContent | null) ?? emptyResumeContent();
  const shouldAutoPrint = autoPrint === "1" || autoPrint === "true";

  return (
    <>
      <ResumePrintView
        content={content}
        fallbackName={user?.name ?? null}
        fallbackEmail={user?.email ?? null}
      />
      {shouldAutoPrint && (
        // Tiny inline script — the print page already wires
        // window.print() to its toolbar button, so all we do here is
        // fire it once on mount. setTimeout 250ms gives Safari time to
        // lay out the print CSS before opening the dialog (without
        // it, the first print job sometimes captures the screen
        // layout instead of the print layout).
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: "setTimeout(function(){try{window.print()}catch(e){}},250);",
          }}
        />
      )}
    </>
  );
}
