/** Shared CSV helpers for report exports (RFC 4180 escaping), mirroring
 *  the existing /api/employer/analytics/export pattern. */

export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvField).join(",");
}

/** Build a downloadable CSV Response with a dated filename. */
export function csvResponse(filenameBase: string, lines: string[]): Response {
  const csv = lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}-${date}.csv"`,
    },
  });
}
