/**
 * Backfill employer-intake submissions from the legacy spreadsheet.
 *
 * The Excel "CompanyRegistrations" tab holds the existing 27 employer
 * registrations. Export THAT tab to CSV (File → Save As / Download → CSV) and
 * run:
 *
 *   DATABASE_URL=<prod-or-local> npx tsx scripts/import-employer-intake.ts ./CompanyRegistrations.csv
 *
 * Idempotent: each row is keyed by CompanyID, so re-running updates rather than
 * duplicating. Rows with no CompanyID fall back to (email + organization).
 *
 * Expected CSV headers (case-insensitive, order-independent):
 *   Timestamp, CompanyID, Name, Title, Email, OrganizationName,
 *   OrganizationAddress, OrganizationWebsite, numberOfInterviews,
 *   latestInterviewScheduled
 */
import { readFileSync } from "node:fs";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SLUG = "employer-intake";

// Minimal field list for the seed create (mirrors src/lib/forms/employer-intake.ts).
const FIELDS = [
  { id: "name", type: "text", label: "Your name", required: true },
  { id: "email", type: "email", label: "Work email", required: true },
  { id: "organization", type: "text", label: "Organization", required: true },
  { id: "title", type: "text", label: "Your title", required: false },
  { id: "website", type: "url", label: "Organization website", required: false },
  { id: "address", type: "text", label: "Organization address", required: false },
  { id: "hiring_timeline", type: "select", label: "Are you hiring interns or early talent soon?", required: false, options: ["Immediately", "Within 3 months", "Within 6 months", "Within 12 months", "No immediate plans"] },
  { id: "needs", type: "textarea", label: "What expertise or talent are you looking for?", required: false },
];

/** Tiny RFC-4180-ish CSV parser (handles quoted fields, commas, escaped quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c === "\r") { /* skip */ }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Excel serial date → ISO string, else pass through. */
function normalizeTimestamp(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const num = Number(t);
  if (Number.isFinite(num) && num > 30000 && num < 80000) {
    return new Date(Math.round((num - 25569) * 86400 * 1000));
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/import-employer-intake.ts <CompanyRegistrations.csv>");
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(file, "utf8"));
  if (rows.length < 2) { console.error("CSV has no data rows."); process.exit(1); }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());
  const col = (r: string[], name: string) => { const i = idx(name); return i >= 0 ? (r[i] ?? "").trim() : ""; };

  const form = await prisma.eventForm.upsert({
    where: { slug: SLUG },
    update: {},
    create: { slug: SLUG, title: "Hire an intern — employer intake", fields: FIELDS as object },
  });

  let created = 0, updated = 0, skipped = 0;
  for (const r of rows.slice(1)) {
    const companyId = col(r, "CompanyID");
    const email = col(r, "Email").toLowerCase();
    const org = col(r, "OrganizationName");
    if (!email && !org) { skipped++; continue; }

    const ts = normalizeTimestamp(col(r, "Timestamp"));
    const data = {
      name: col(r, "Name"),
      email: col(r, "Email"),
      title: col(r, "Title"),
      organization: org,
      address: col(r, "OrganizationAddress"),
      website: col(r, "OrganizationWebsite"),
      hiring_timeline: "",
      needs: "",
      companyId,
      numberOfInterviews: col(r, "numberOfInterviews"),
      latestInterviewScheduled: col(r, "latestInterviewScheduled"),
      source: "spreadsheet-import",
    };

    // Find an existing row by CompanyID (preferred) or email+org.
    const existing = await prisma.eventFormSubmission.findFirst({
      where: companyId
        ? { formId: form.id, data: { path: ["companyId"], equals: companyId } }
        : { formId: form.id, email, data: { path: ["organization"], equals: org } },
      select: { id: true },
    });

    if (existing) {
      await prisma.eventFormSubmission.update({ where: { id: existing.id }, data: { email, data } });
      updated++;
    } else {
      await prisma.eventFormSubmission.create({
        data: {
          formId: form.id,
          email,
          reviewStatus: "approved", // existing partners — already vetted
          data,
          ...(ts ? { createdAt: ts } : {}),
        },
      });
      created++;
    }
  }
  console.log(`Done. created=${created} updated=${updated} skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
