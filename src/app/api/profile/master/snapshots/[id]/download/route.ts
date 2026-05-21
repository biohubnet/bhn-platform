/**
 * GET /api/profile/master/snapshots/[id]/download?format=json
 *
 * Returns the snapshot as a downloadable file with a versioned
 * Content-Disposition filename:
 *
 *   master-resume_<slug>_v<n>_<YYYY-MM-DD>.json
 *
 * Today only `format=json` is supported. PDF generation will land
 * in a follow-up; the existing /profile/resume/preview print-styled
 * HTML page can render any ResumeContent tree, so the PDF path is
 * "fetch that HTML server-side + run through a renderer", which is
 * a bigger lift than this MVP.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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
  // YYYY-MM-DD (UTC) — stable filename regardless of viewer timezone.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") ?? "json";

  // Ownership check via masterId → userId join.
  const snapshot = await prisma.masterSnapshot.findFirst({
    where: { id, master: { userId } },
    select: {
      id: true, versionNumber: true, name: true, createdAt: true, content: true,
      master: { select: { id: true } },
    },
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  // Filename — pull the user's display name from the snapshot
  // header if it's stored there; fall back to the session's name.
  const sessionName = (session.user as { name?: string }).name ?? "user";
  const contentObj = snapshot.content as Record<string, unknown> | null;
  const contentHeader = contentObj && typeof contentObj === "object" && "header" in contentObj
    ? (contentObj.header as Record<string, unknown> | undefined)
    : undefined;
  const headerName = typeof contentHeader?.name === "string" && contentHeader.name
    ? (contentHeader.name as string)
    : sessionName;
  const slug = slugify(headerName);
  const date = isoDate(snapshot.createdAt);

  if (format === "json") {
    const filename = `master-resume_${slug}_v${snapshot.versionNumber}_${date}.json`;
    const json = JSON.stringify(
      {
        snapshotId: snapshot.id,
        versionNumber: snapshot.versionNumber,
        name: snapshot.name,
        createdAt: snapshot.createdAt.toISOString(),
        content: snapshot.content,
      },
      null,
      2,
    );
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // PDF support pending — return 501 with a clear note so the UI
  // can fall back to JSON until the PDF renderer lands.
  return NextResponse.json(
    {
      error: "PDF download is not implemented in this build. Use ?format=json for now.",
    },
    { status: 501 },
  );
}
