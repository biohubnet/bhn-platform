import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { answerFields, type FormField } from "@/lib/forms/types";

export const runtime = "nodejs";

function csvCell(s: unknown): string {
  if (s === null || s === undefined) return "";
  // Arrays (multicheckbox) join with semicolons so they survive a comma-
  // delimited CSV without confusing the parser.
  const str = Array.isArray(s)
    ? s.map((x) => String(x)).join("; ")
    : typeof s === "string"
      ? s
      : String(s);
  // Always quote — handles commas, newlines, quotes, leading whitespace,
  // and the Excel-specific "leading +/=/@/-" formula injection footgun
  // (each escape just doubles inner quotes).
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { slug } = await params;
  const form = await prisma.eventForm.findUnique({
    where: { slug },
    include: { submissions: { orderBy: { createdAt: "asc" } } },
  });
  if (!form) return new NextResponse("Not found", { status: 404 });

  const fields = form.fields as unknown as FormField[];
  const ansFields = answerFields(fields);

  const header = ["Submitted at", "Email", ...ansFields.map((f) => f.label)];
  const lines = [header.map(csvCell).join(",")];
  for (const s of form.submissions) {
    const data = s.data as Record<string, string | string[]>;
    const row: unknown[] = [
      new Date(s.createdAt).toISOString(),
      s.email ?? "",
      ...ansFields.map((f) => data[f.id] ?? ""),
    ];
    lines.push(row.map(csvCell).join(","));
  }

  // BOM so Excel auto-detects UTF-8 (covers accented names, em dashes etc.)
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-submissions-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
