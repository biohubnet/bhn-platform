import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET || "bhn-scorm";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

export const r2 = accountId && accessKeyId && secretAccessKey
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

export function r2PublicUrl(key: string) {
  return `${R2_PUBLIC_URL}/${key.replace(/^\//, "")}`;
}

/** Infer Content-Type from file extension. SCORM packages serve HTML/JS/CSS/images. */
function contentTypeFor(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    xml: "application/xml; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    webm: "video/webm",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    pdf: "application/pdf",
    zip: "application/zip",
    txt: "text/plain; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function putR2Object(key: string, body: Buffer | Uint8Array, contentType?: string) {
  if (!r2) throw new Error("R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.");
  const cleanKey = key.replace(/^\//, "");
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: cleanKey,
      Body: body,
      ContentType: contentType ?? contentTypeFor(cleanKey),
    })
  );
  return cleanKey;
}

export async function deleteR2Prefix(prefix: string) {
  if (!r2) throw new Error("R2 not configured.");
  const cleanPrefix = prefix.replace(/^\//, "");
  let continuationToken: string | undefined;
  do {
    const list = await r2.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: cleanPrefix, ContinuationToken: continuationToken })
    );
    if (list.Contents && list.Contents.length > 0) {
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: list.Contents.map((o) => ({ Key: o.Key! })) },
        })
      );
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}
