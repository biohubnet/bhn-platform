import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { Readable } from "stream";

export const runtime = "nodejs";

// Every asset of a SCORM package comes through this proxy (a same-origin
// prefix is required — see next.config.ts: cross-origin R2 URLs break the
// package's `window.parent.API` discovery). A real Storyline/Captivate course
// is hundreds of files, so a cohort launching together multiplies straight
// into function invocations. `s-maxage` lets Vercel's Edge Network absorb that
// fan-out: the first request per asset populates the edge, the rest never
// reach a function.
//
// Why 1 hour and NOT `immutable` / a year: these keys are NOT content-addressed.
// Re-uploading a package wipes and rewrites the SAME `scorm/<courseId>/...`
// keys (api/courses/[id]/upload-scorm/route.ts:59-60), and the assets are
// fetched by the package's own internal relative links, so there is no URL to
// hang a version on. A long TTL would pin stale course content at the edge with
// no way to bust it. One hour matches the staleness this route already had, and
// still absorbs essentially the whole launch burst. If you ever need a long TTL,
// version the prefix first (`scorm/<courseId>/<version>/...`) so relative links
// resolve under it, then this can safely become immutable.
const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; path: string[] }> }
) {
  if (!r2) return new NextResponse("R2 not configured", { status: 500 });
  const { courseId, path } = await params;
  const key = `scorm/${courseId}/${path.join("/")}`;
  const inm = req.headers.get("if-none-match") ?? undefined;

  try {
    // Hand the validator to R2 so an unchanged asset costs no body transfer at
    // all — it answers 304 and we pass that straight through.
    const res = await r2.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ...(inm ? { IfNoneMatch: inm } : {}),
      }),
    );

    // Belt-and-braces: if R2 ignored the conditional and sent a 200 anyway,
    // still answer 304 rather than re-transfer an identical body.
    if (inm && res.ETag && inm === res.ETag) {
      return new NextResponse(null, {
        status: 304,
        headers: { "Cache-Control": CACHE_CONTROL, ETag: res.ETag },
      });
    }

    if (!res.Body) return new NextResponse("Not found", { status: 404 });

    // res.Body is a Node Readable (or web ReadableStream). Convert to web stream.
    const body = res.Body as Readable;
    const webStream = Readable.toWeb(body) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": res.ContentType ?? "application/octet-stream",
        "Cache-Control": CACHE_CONTROL,
        ...(res.ETag ? { ETag: res.ETag } : {}),
      },
    });
  } catch (e: unknown) {
    const err = e as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };
    // A conditional GET that matches surfaces as a thrown 304 in the AWS SDK.
    if (err.$metadata?.httpStatusCode === 304 || err.name === "NotModified" || err.name === "304") {
      return new NextResponse(null, {
        status: 304,
        headers: { "Cache-Control": CACHE_CONTROL, ...(inm ? { ETag: inm } : {}) },
      });
    }
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error("R2 fetch error:", err.message);
    return new NextResponse("Internal error", { status: 500 });
  }
}
