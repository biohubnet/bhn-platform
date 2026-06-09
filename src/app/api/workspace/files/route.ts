/**
 * Workspace → File Sharing (admin-only).
 *   GET  /api/workspace/files   → list (active by default; ?archived=1 includes archived)
 *   POST /api/workspace/files   → multipart upload { file, title?, description? }
 *
 * Bytes go to R2 under a key with a 128-bit random token — same
 * unguessable-URL model as form uploads — so the public URL doubles as
 * a share link that works without a login.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { putR2Object, r2PublicUrl, R2_PUBLIC_URL } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — same hard ceiling as form uploads

export async function GET(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const includeArchived = new URL(req.url).searchParams.get("archived") === "1";
  const files = await prisma.sharedFile.findMany({
    where: { category: "file-sharing", ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    ok: true,
    files: files.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      fileName: f.fileName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      isArchived: f.isArchived,
      shareUrl: R2_PUBLIC_URL && f.storageKey ? r2PublicUrl(f.storageKey) : null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!R2_PUBLIC_URL) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 500 });
  }
  const uid = (session.user as { id?: string }).id ?? null;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart payload." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is ${(file.size / 1_048_576).toFixed(1)} MB; max is ${(MAX_BYTES / 1_048_576).toFixed(0)} MB.` },
      { status: 413 }
    );
  }
  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");
  const title = (typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : file.name).slice(0, 160);
  const description = (typeof rawDescription === "string" ? rawDescription : "").slice(0, 600);

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
  // 128-bit random token keeps the public URL unguessable.
  const token = randomBytes(16).toString("hex");
  const key = `workspace-files/${token}/${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await putR2Object(key, buf, file.type || "application/octet-stream");

  const created = await prisma.sharedFile.create({
    data: {
      category: "file-sharing",
      title,
      description,
      storageKey: key,
      fileName: file.name.slice(0, 160),
      mimeType: (file.type || "application/octet-stream").slice(0, 120),
      sizeBytes: file.size,
      createdById: uid,
    },
  });
  return NextResponse.json(
    {
      ok: true,
      file: {
        id: created.id,
        title: created.title,
        fileName: created.fileName,
        sizeBytes: created.sizeBytes,
        shareUrl: r2PublicUrl(created.storageKey),
      },
    },
    { status: 201 }
  );
}
