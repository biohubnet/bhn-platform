/**
 * GET /api/profile/master/snapshots/[id]/download?format=json|pdf
 *
 * Returns the snapshot as a downloadable file with a versioned
 * Content-Disposition filename:
 *
 *   master-resume_<slug>_v<n>_<YYYY-MM-DD>.json
 *
 * `format=json` (default) streams JSON inline.
 *
 * `format=pdf` is an MVP — we don't have a server-side PDF renderer
 * (no puppeteer / chromium in the deploy bundle), so this branch
 * 302-redirects to `/profile/master/snapshots/[id]/print?autoPrint=1`.
 * That page renders the same ResumePrintView the active-resume
 * preview uses and auto-fires `window.print()`; the user's browser
 * picks "Save as PDF" as the destination. The user types the filename
 * suggestion themselves — the redirect target's <title> is set so
 * the browser's print dialog defaults to a sensible filename.
 * Server-side PDF render can land later by swapping this branch for
 * a renderer call; the caller-facing URL stays the same.
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

  if (format === "pdf") {
    // No server-side PDF render — redirect to the print-friendly
    // page with the auto-print flag. The browser then opens its own
    // print dialog (where "Save as PDF" is the default destination on
    // every modern browser). Filename naming is decided in the dialog
    // by the user, but the print page sets document.title so the
    // suggestion lands close to our `master-resume_<slug>_v<n>_<date>`
    // convention.
    const target = new URL(req.url);
    target.pathname = `/profile/master/snapshots/${snapshot.id}/print`;
    target.search = "?autoPrint=1";
    // 302 (default) — not a permanent redirect; the target URL is
    // session-dependent (auth-gated) and the JSON branch lives at the
    // same path with a different query.
    return NextResponse.redirect(target);
  }

  return NextResponse.json(
    {
      error: `Unsupported format "${format}". Use json or pdf.`,
    },
    { status: 400 },
  );
}
