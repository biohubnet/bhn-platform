import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string; path: string[] }> }
) {
  if (!r2) return new NextResponse("R2 not configured", { status: 500 });
  const { courseId, path } = await params;
  const key = `scorm/${courseId}/${path.join("/")}`;

  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    if (!res.Body) return new NextResponse("Not found", { status: 404 });

    // res.Body is a Node Readable (or web ReadableStream). Convert to web stream.
    const body = res.Body as Readable;
    const webStream = Readable.toWeb(body) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": res.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        ...(res.ETag ? { ETag: res.ETag } : {}),
      },
    });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err.name === "NoSuchKey") return new NextResponse("Not found", { status: 404 });
    console.error("R2 fetch error:", err.message);
    return new NextResponse("Internal error", { status: 500 });
  }
}
