import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseManifest } from "@/lib/scorm-parser";
import path from "path";
import fs from "fs";
import unzipper from "unzipper";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  await requireRole("admin");

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "public", "uploads", "scorm", courseId);
  fs.mkdirSync(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const zipPath = path.join(uploadDir, "package.zip");
  fs.writeFileSync(zipPath, buffer);

  // Extract
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: uploadDir }))
      .on("close", resolve)
      .on("error", reject);
  });
  fs.unlinkSync(zipPath);

  // Parse manifest
  const manifestPath = path.join(uploadDir, "imsmanifest.xml");
  if (!fs.existsSync(manifestPath)) {
    return NextResponse.json({ error: "No imsmanifest.xml found" }, { status: 422 });
  }
  const manifestXml = fs.readFileSync(manifestPath, "utf-8");
  const manifest = await parseManifest(manifestXml);

  const uploadPath = `/uploads/scorm/${courseId}`;

  const pkg = await prisma.scormPackage.upsert({
    where: { courseId },
    update: {
      version: manifest.version,
      entryPoint: manifest.entryPoint,
      manifestData: JSON.stringify(manifest),
      uploadPath,
    },
    create: {
      courseId,
      version: manifest.version,
      entryPoint: manifest.entryPoint,
      manifestData: JSON.stringify(manifest),
      uploadPath,
    },
  });

  await prisma.course.update({
    where: { id: courseId },
    data: { courseType: "scorm", title: pkg.version ? undefined : manifest.title },
  });

  return NextResponse.json(pkg, { status: 201 });
}
