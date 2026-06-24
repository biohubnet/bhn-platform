/**
 * Plain-text extraction from an uploaded resume file (PDF / DOCX / TXT).
 *
 * Shared by the URL-based re-parse route (structure/parse) and the
 * direct file-upload route (master/import-file) so both behave
 * identically. PDF goes through `unpdf`, DOCX through `mammoth`, TXT is
 * read as UTF-8; an unknown type is tried as a PDF and falls back to
 * raw UTF-8. Throws on a hard read failure so the caller can surface a
 * 4xx instead of silently importing nothing.
 */

export interface ExtractHint {
  /** Original filename, used to pick the decoder by extension. */
  filename?: string | null;
  /** MIME type from the upload, used when the extension is missing. */
  mime?: string | null;
}

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function looksLikePdf(name: string, mime: string): boolean {
  return name.endsWith(".pdf") || name.includes(".pdf?") || mime === PDF_MIME;
}
function looksLikeDocx(name: string, mime: string): boolean {
  return name.endsWith(".docx") || mime === DOCX_MIME;
}
function looksLikeTxt(name: string, mime: string): boolean {
  return name.endsWith(".txt") || mime.startsWith("text/");
}

async function pdfText(buf: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const r = await extractText(new Uint8Array(buf), { mergePages: true });
  return Array.isArray(r.text) ? r.text.join("\n") : (r.text ?? "");
}

/** Extract usable plain text from a resume file buffer. Never returns
 *  partial garbage silently — an empty/too-short result is the caller's
 *  signal to reject the upload. */
export async function extractResumeText(buf: Buffer, hint: ExtractHint = {}): Promise<string> {
  const name = (hint.filename ?? "").toLowerCase();
  const mime = (hint.mime ?? "").toLowerCase();

  if (looksLikePdf(name, mime)) return pdfText(buf);
  if (looksLikeDocx(name, mime)) {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer: buf });
    return r.value ?? "";
  }
  if (looksLikeTxt(name, mime)) return buf.toString("utf-8");

  // Unknown type — best effort: try PDF, then fall back to raw UTF-8.
  try {
    return await pdfText(buf);
  } catch {
    return buf.toString("utf-8");
  }
}

/** Heuristic accept-check for the dropzone / endpoint guard. Mirrors
 *  the decoders above. */
export function isSupportedResumeFile(filename: string | null | undefined, mime: string | null | undefined): boolean {
  const name = (filename ?? "").toLowerCase();
  const m = (mime ?? "").toLowerCase();
  return (
    looksLikePdf(name, m) ||
    looksLikeDocx(name, m) ||
    looksLikeTxt(name, m) ||
    // Some browsers send an empty MIME for .doc/.rtf — let the server
    // try and fail gracefully rather than blocking the upload here.
    name.endsWith(".doc") ||
    name.endsWith(".rtf")
  );
}
