import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { r2, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";

interface DocEntry { key: string; name: string; contentType: string; size: number }

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return new NextResponse("Forbidden", { status: 403 });
  if (!r2) return new NextResponse("R2 not configured", { status: 500 });

  const { id } = await params;
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return new NextResponse("key required", { status: 400 });

  // Verify the key actually belongs to this application — defense in depth
  const app = await prisma.creditApplication.findUnique({
    where: { id },
    select: { documents: true },
  });
  if (!app) return new NextResponse("Not found", { status: 404 });
  const docs = (app.documents as unknown as DocEntry[]) ?? [];
  const doc = docs.find((d) => d.key === key);
  if (!doc) return new NextResponse("Document not in application", { status: 404 });

  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    if (!res.Body) return new NextResponse("Empty", { status: 404 });
    const body = res.Body as Readable;
    const webStream = Readable.toWeb(body) as unknown as ReadableStream;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": doc.contentType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
