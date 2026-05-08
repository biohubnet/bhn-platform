/**
 * Idempotently seed placeholder file uploads for the talent-application
 * "Fill with sample" feature. Generates 3 minimal valid PDFs server-
 * side and uploads them to R2 at fixed paths. Returns the public URLs
 * so the DemoFiller can drop them into the file fields.
 *
 *   POST /api/admin/forms/talent-application/seed-samples
 *
 * Returns the same URLs every call — paths are deterministic, so
 * repeated calls just no-op the upload (S3-style PutObject is
 * effectively idempotent on the same key + contents).
 *
 * Why minimal PDFs and not real ones: bundling binary assets in /public
 * is fragile across builds; generating ~700-byte valid PDFs in code is
 * deterministic and testable. Each PDF carries a label so when an
 * employer views the test submission's "resume" link they see a real
 * (but tiny) PDF that explicitly says "BHN sample placeholder" rather
 * than a broken file.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { putR2Object, r2PublicUrl, R2_PUBLIC_URL } from "@/lib/r2";

export const runtime = "nodejs";

const SAMPLES = [
  { key: "samples/talent-app/resume.pdf",            label: "BHN — sample resume placeholder" },
  { key: "samples/talent-app/support-letter.pdf",    label: "BHN — sample supervisor letter placeholder" },
  { key: "samples/talent-app/supporting-document.pdf", label: "BHN — sample supporting document placeholder" },
];

/**
 * Build a minimal valid PDF (1 page, 1 line of text). ~700 bytes.
 * Computes byte-precise xref offsets so any PDF reader will accept it.
 */
function makeMinimalPdf(label: string): Buffer {
  const stream = `BT /F1 14 Tf 50 750 Td (${label}) Tj ET`;
  const objects = [
    `<</Type/Catalog/Pages 2 0 R>>`,
    `<</Type/Pages/Kids[3 0 R]/Count 1>>`,
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>`,
    `<</Length ${Buffer.byteLength(stream)}>>\nstream\n${stream}\nendstream`,
    `<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "utf-8");
}

export async function POST() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!R2_PUBLIC_URL) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 500 });
  }

  const urls: Record<string, string> = {};
  for (const s of SAMPLES) {
    const buf = makeMinimalPdf(s.label);
    await putR2Object(s.key, buf, "application/pdf");
    urls[s.key.split("/").pop()!.replace(".pdf", "")] = r2PublicUrl(s.key);
  }

  // Map back to talent-app field IDs for the client.
  return NextResponse.json({
    ok: true,
    urls: {
      resume:               urls["resume"],
      support_letter:       urls["support-letter"],
      supporting_document:  urls["supporting-document"],
    },
  });
}
