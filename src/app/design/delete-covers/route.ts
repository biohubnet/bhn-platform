/**
 * Serve the delete-cover exploration HTML via a Route Handler so it
 * doesn't depend on /public static serving (which was returning 404
 * before deploy lag was resolved). Reads the file from disk at
 * request time — small, cached at the CDN, no template overhead.
 *
 * URL: /design/delete-covers
 */
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
// Cache at the edge for 5 min — same content for everyone.
export const revalidate = 300;

export async function GET() {
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), "public", "design", "delete-cover-options.html"),
      "utf-8",
    );
    return new Response(file, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    return new Response(
      `<!doctype html><meta charset="utf-8"><h1>delete-cover-options.html not found</h1><pre>${
        (err as Error).message
      }</pre>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}
