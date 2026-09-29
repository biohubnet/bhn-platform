/**
 * Internship postings from the host-company Google Sheet.
 *
 * Companies already submit postings through a form that writes to a
 * sheet; this copies them onto the platform so the /internships board
 * and the trainee home's "Upcoming opportunities" show them. Each row
 * becomes the InternshipPosting with id `sheet-<jobID>`, so re-running
 * updates the same rows. The sheet is the source of truth for those
 * rows: an edit made on the platform is overwritten by the next sync.
 *
 * Only posting fields are read. The sheet also has the submitter's
 * email, contact names, selected students and a password column; none
 * of them is ever copied.
 *
 * The sheet link lives in PlatformSetting (POSTINGS_SHEET_SETTING, set
 * on /admin/settings), not in code: this repo is public and the sheet
 * is readable by anyone with its link.
 *
 * Runs from the daily maintenance cron and the "Sync from sheet" button
 * on /internships.
 */
import { prisma } from "@/lib/prisma";
import { torontoToday } from "@/lib/dashboard-promos";

export const POSTINGS_SHEET_SETTING = "postingsSheetUrl";
export const SHEET_ID_PREFIX = "sheet-";

/** RFC 4180 CSV: quoted fields may hold commas, newlines and "" quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * A sheet link → its CSV URL. Google Sheets only. Takes an edit link (the
 * whole sheet shared by link) or, safer, a "Publish to web" link to a tab
 * holding only the posting columns.
 */
export function sheetCsvUrl(link: string): string | null {
  let url: URL;
  try { url = new URL(link.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
  const gid = (url.searchParams.get("gid") ?? url.hash.match(/gid=(\d+)/)?.[1] ?? "0").replace(/\D/g, "") || "0";
  const published = url.pathname.match(/^\/spreadsheets\/d\/e\/([A-Za-z0-9_-]+)\/pub/)?.[1];
  if (published) return `https://docs.google.com/spreadsheets/d/e/${published}/pub?output=csv&gid=${gid}`;
  const id = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/)?.[1];
  if (!id || id === "e") return null;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

/** The form's plain text → Markdown, which the posting page renders:
 *  every line its own block, and "•" bullets as list items. */
function plainToMarkdown(v: string): string {
  return v.trim().replace(/\r\n?/g, "\n").replace(/^[ \t]*[•●▪◦][ \t]*/gm, "- ").replace(/\n+/g, "\n\n");
}

/** "2026-08-09" or "2026-08-31T00:00:00.000Z" → that calendar day at UTC midnight. */
function parseDay(v: string): Date | null {
  const ymd = v.trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function website(v: string): string | null {
  const s = v.trim();
  if (!s || /\s/.test(s)) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

const text = (v: string | undefined) => (v ?? "").trim() || null;

/**
 * One sheet row → posting data, or null when it lacks a job ID, title or
 * company. Status: "active" in the sheet and not past its deadline is
 * active; past the deadline or "inactive" is closed (not "expired", which
 * the admin table on /internships doesn't list); blank (not yet
 * reviewed) is a draft. Trainees see active postings only.
 */
export function rowToPosting(r: Record<string, string>, today: Date) {
  const jobId = r.jobID?.trim() ?? "";
  const title = text(r.jobTitle);
  const companyName = text(r.companyName);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(jobId) || !title || !companyName) return null;

  const deadline = parseDay(r.position_deadline ?? "");
  const flag = (r.active_inactive ?? "").trim().toLowerCase();
  const status =
    flag === "active" ? (deadline && deadline < today ? "closed" : "active")
    : flag === "inactive" || flag === "closed" ? "closed"
    : "draft";
  const created = new Date(r.rowCreationISOTimestamp ?? "");

  return {
    id: `${SHEET_ID_PREFIX}${jobId}`,
    createdAt: Number.isNaN(created.getTime()) ? undefined : created,
    data: {
      companyName,
      title,
      website: website(r.companyWebsite ?? ""),
      duration: text(r.position_duration),
      hours: text(r.position_hours),
      location: text(r.position_location),
      type: text(r.position_type) ?? text(r.jobWorkModel),
      compensation: text(r.position_compensation),
      deadline,
      keySkills: [...new Set((r.position_skills ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))],
      positionDetails: plainToMarkdown(r.jobDescription ?? ""),
      status,
    },
  };
}

export type SheetSyncResult = { synced: number; skipped: number; closed: number } | { error: string };

export async function syncPostingsFromSheet(now = new Date()): Promise<SheetSyncResult> {
  const setting = await prisma.platformSetting.findUnique({ where: { key: POSTINGS_SHEET_SETTING } });
  const csvUrl = setting?.value ? sheetCsvUrl(setting.value) : null;
  if (!csvUrl) return { error: "No postings sheet link is set on /admin/settings." };

  const res = await fetch(csvUrl, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const type = res.headers.get("content-type") ?? "";
  // A sheet that isn't shared answers with a Google sign-in page, not CSV.
  if (!res.ok || !type.includes("text/csv")) return { error: `The sheet did not return CSV (HTTP ${res.status}). Is it shared by link?` };

  const [rawHeader, ...rawLines] = parseCsv(await res.text());
  const header = (rawHeader ?? []).map((h) => h.trim());
  const missing = ["jobID", "jobTitle", "companyName"].filter((c) => !header.includes(c));
  if (missing.length) return { error: `The sheet has no ${missing.join(", ")} column.` };

  const today = torontoToday(now);
  const rows = rawLines
    .filter((cells) => cells.some((c) => c.trim()))
    .map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));
  const postings = rows.map((r) => rowToPosting(r, today)).filter((p): p is NonNullable<typeof p> => p !== null);
  const skipped = rows.length - postings.length;
  if (rows.length && !postings.length) return { error: `None of the sheet's ${rows.length} rows has a job ID, title and company.` };
  // A job ID listed twice keeps its last row.
  const byId = new Map(postings.map((p) => [p.id, p]));
  // Close only what is gone from the sheet. A row still there but briefly
  // incomplete (say, a blank title mid-edit) keeps its posting as it was.
  const inSheet = rows.map((r) => `${SHEET_ID_PREFIX}${(r.jobID ?? "").trim()}`);

  await prisma.$transaction([...byId.values()].map((p) =>
    prisma.internshipPosting.upsert({
      where: { id: p.id },
      create: { id: p.id, createdAt: p.createdAt, ...p.data },
      update: p.data,
    }),
  ));
  // Rows taken out of the sheet close rather than disappear: applications
  // and interviews may point at them.
  const { count: closed } = await prisma.internshipPosting.updateMany({
    where: { id: { startsWith: SHEET_ID_PREFIX, notIn: inSheet }, status: { not: "closed" } },
    data: { status: "closed" },
  });
  return { synced: byId.size, skipped, closed };
}
