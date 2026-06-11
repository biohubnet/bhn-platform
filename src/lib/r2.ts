import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET || "bhn-scorm";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

/**
 * Extra public-URL bases that should STILL resolve to keys in the current
 * bucket — i.e. the OLD host(s) after an R2/account migration, while existing
 * DB rows still hold the previous absolute URLs. Comma-separated.
 *
 * Why this exists: file URLs are stored absolutely (`r2PublicUrl(key)` bakes
 * the host into the value). Moving to a bucket with a different public host
 * would otherwise orphan every stored URL. Instead, at cutover set
 *   R2_LEGACY_PUBLIC_URLS="https://old-host"
 * and every old URL keeps resolving — zero DB rewrites. Empty by default, so
 * behaviour is identical until a migration sets it.
 */
const R2_LEGACY_PUBLIC_URLS = (process.env.R2_LEGACY_PUBLIC_URLS || "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

/** All public-URL bases we recognise as ours — the current host first, then
 *  any legacy hosts. Used to map a stored URL back to its object key. */
export const R2_PUBLIC_URL_PREFIXES: string[] = [R2_PUBLIC_URL, ...R2_LEGACY_PUBLIC_URLS].filter(Boolean);

/** Does this URL point at one of our public bases (current or legacy)? */
export function isR2PublicUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return R2_PUBLIC_URL_PREFIXES.some((p) => url.startsWith(p));
}

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

/**
 * Mint a short-lived signed GET URL for an R2 object. Use this for
 * any artifact that should NOT live behind a public bucket — e.g.
 * trainee resumes / video introductions / submission attachments. The
 * caller must already have authorised that the requesting user has
 * read access to the key (this helper does not check permissions).
 *
 * @param key  the R2 object key (no leading slash)
 * @param ttlSeconds  expiry; defaults to 5 minutes — long enough to
 *   click through, short enough that a leaked URL stops working
 *   quickly. Cap this at 7 days (S3's hard limit on presigned URLs).
 *
 * Returns null if R2 isn't configured (preview / test environments).
 */
export async function getSignedR2GetUrl(
  key: string,
  ttlSeconds = 300,
): Promise<string | null> {
  if (!r2) return null;
  const cleanKey = key.replace(/^\//, "");
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: cleanKey });
  return getSignedUrl(r2, cmd, { expiresIn: Math.min(ttlSeconds, 7 * 24 * 3600) });
}

/**
 * Pull the R2 key out of a stored public URL. Used during the
 * public-bucket → signed-URL migration: existing User.resumeUrl /
 * videoIntroUrl rows store full https URLs; we want to keep them
 * working but mint signed URLs at read time.
 *
 * Returns null if the input isn't one of our public bases (current or, after
 * a migration, a legacy host in R2_LEGACY_PUBLIC_URLS).
 */
export function r2KeyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = R2_PUBLIC_URL_PREFIXES.find((p) => url.startsWith(p));
  if (!prefix) return null;
  return url.slice(prefix.length).replace(/^\//, "").split("?")[0] || null;
}

/**
 * Best-effort: turn a stored URL OR an R2 key into a signed URL.
 * Convenience for callers that don't want to branch.
 */
export async function getSignedR2UrlForUrlOrKey(
  urlOrKey: string | null | undefined,
  ttlSeconds = 300,
): Promise<string | null> {
  if (!urlOrKey) return null;
  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    const key = r2KeyFromPublicUrl(urlOrKey);
    if (!key) return null;
    return getSignedR2GetUrl(key, ttlSeconds);
  }
  return getSignedR2GetUrl(urlOrKey, ttlSeconds);
}

/**
 * Are signed URLs the canonical access pattern? Controlled by the
 * R2_USE_SIGNED_URLS env flag so leadership / ops can flip the bucket
 * to private and turn this on without a code deploy. When false (the
 * current default), code paths fall back to public URLs — good for
 * the migration period where the bucket is still public but new
 * uploads embed a 128-bit token in the path.
 */
export const R2_USE_SIGNED_URLS =
  (process.env.R2_USE_SIGNED_URLS ?? "").toLowerCase() === "true";

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

/**
 * Delete a single R2 object by full URL or key.
 *
 * Accepts either:
 *   • a full R2_PUBLIC_URL/<key> (with or without `?v=` cache-bust suffix)
 *   • a bare key like "applications/USERID/abc/resume.pdf"
 *
 * No-ops silently when the URL isn't one of our public bases — that way
 * callers can pass `user.resumeUrl` directly without first stripping a
 * hand-typed external URL (the upload + PATCH routes already validate that
 * resumeUrl belongs to our R2, but defending in depth here keeps a stale
 * legacy URL from causing a 500). Recognises legacy hosts too, so cleanup
 * still works on pre-migration URLs.
 */
export async function deleteR2ObjectByUrl(urlOrKey: string | null | undefined) {
  if (!urlOrKey || !r2) return;
  let key: string | null;
  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    key = r2KeyFromPublicUrl(urlOrKey);
  } else {
    key = urlOrKey.replace(/^\//, "");
  }
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch {
    // Best-effort cleanup. A failed delete shouldn't block the user's
    // primary action (e.g. uploading a replacement).
  }
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
