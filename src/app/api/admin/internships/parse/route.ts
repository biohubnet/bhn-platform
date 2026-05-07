import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { chat, AI_CONFIGURED } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MAX_FILE = 20 * 1024 * 1024; // 20 MB — Gemini's inline-data ceiling
const ACCEPTED_FILE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/markdown",
  "text/html",
]);

interface Parsed {
  companyName: string;
  website: string;
  title: string;
  duration: string;
  hours: string;
  location: string;
  type: string;
  compensation: string;
  deadline: string;          // YYYY-MM-DD or empty
  keySkills: string[];       // up to 5
  positionDetails: string;
}

const SYSTEM = `You extract internship / job postings into a strict JSON schema.

Read the input — it could be plain text, a copy-pasted job description, an email, or part of a PDF — and produce ONE JSON object with these keys:

{
  "companyName": string,                    // organisation hiring
  "website": string,                        // company website url, or "" if unknown
  "title": string,                          // role title
  "duration": string,                       // e.g. "4 months", "Summer 2026", "1 year"
  "hours": string,                          // e.g. "Full-time, ~40 hrs/week"
  "location": string,                       // e.g. "Toronto, ON" or "Remote — Canada"
  "type": string,                           // e.g. "Internship", "Co-op", "Full-time"
  "compensation": string,                   // e.g. "$25/hr", "Paid", "Unpaid"
  "deadline": string,                       // YYYY-MM-DD if explicit, else ""
  "keySkills": string[],                    // up to 5 most-relevant hard skills, in priority order
  "positionDetails": string                 // multi-paragraph description, kept faithful to source. Strip headers like "Position Details:" — just the body.
}

Rules:
- Output ONLY the JSON object. No markdown fences, no commentary.
- If a field can't be inferred, use "" (empty string) for strings or [] for arrays.
- Do not invent details. If location says "remote" without country, just write "Remote".
- positionDetails should preserve paragraphs with \\n\\n.`;

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!AI_CONFIGURED.chat) {
    return NextResponse.json(
      { error: "AI parser is not configured (set CF_AI_TOKEN or GEMINI_API_KEY)." },
      { status: 503 }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let rawAi: string;

  if (contentType.startsWith("multipart/form-data")) {
    // File-upload path: needs Gemini multimodal (Cloudflare Llama is text-only).
    if (!GEMINI_KEY) {
      return NextResponse.json(
        { error: "File parsing needs GEMINI_API_KEY. Paste the text instead, or set the key." },
        { status: 503 }
      );
    }
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart payload." }, { status: 400 });
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file in upload." }, { status: 400 });
    }
    if (file.size > MAX_FILE) {
      return NextResponse.json(
        { error: `File is ${(file.size / 1_048_576).toFixed(1)} MB; max is 20 MB.` },
        { status: 413 }
      );
    }
    if (!ACCEPTED_FILE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type "${file.type}". Try PDF, image, or plain text.` },
        { status: 415 }
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    try {
      rawAi = await callGeminiMultimodal(bytes, file.type);
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message || "AI parse failed." },
        { status: 502 }
      );
    }
  } else {
    const body = (await req.json().catch(() => ({}))) as { text?: string };
    const text = (body.text ?? "").trim();
    if (text.length < 30) {
      return NextResponse.json(
        { error: "Paste at least 30 characters of job description for the AI to parse." },
        { status: 400 }
      );
    }
    const result = await chat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: text.slice(0, 12000) },
      ],
      { feature: "internship_parse", maxTokens: 1500, temperature: 0.1 }
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "AI parse failed." }, { status: 502 });
    }
    rawAi = result.text;
  }

  // The model sometimes wraps in ```json fences despite instructions —
  // strip them defensively before JSON.parse.
  const raw = rawAi
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: Parsed;
  try {
    parsed = JSON.parse(raw) as Parsed;
  } catch {
    return NextResponse.json(
      { error: "AI returned non-JSON. Try editing the source and parsing again.", raw },
      { status: 502 }
    );
  }

  // Coerce + clamp.
  const safe: Parsed = {
    companyName: String(parsed.companyName ?? "").trim(),
    website: String(parsed.website ?? "").trim(),
    title: String(parsed.title ?? "").trim(),
    duration: String(parsed.duration ?? "").trim(),
    hours: String(parsed.hours ?? "").trim(),
    location: String(parsed.location ?? "").trim(),
    type: String(parsed.type ?? "").trim(),
    compensation: String(parsed.compensation ?? "").trim(),
    deadline: String(parsed.deadline ?? "").trim(),
    keySkills: Array.isArray(parsed.keySkills)
      ? parsed.keySkills.map((s) => String(s).trim()).filter(Boolean).slice(0, 5)
      : [],
    positionDetails: String(parsed.positionDetails ?? "").trim(),
  };

  return NextResponse.json({ ok: true, posting: safe });
}

/**
 * Send the file to Gemini 1.5 Flash multimodal. Inline data is fine
 * for files up to 20 MB; the model returns the same JSON shape as the
 * text-only call above.
 */
async function callGeminiMultimodal(base64: string, mimeType: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract the internship posting from the attached file into the JSON schema described in the system instruction." },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 1500, temperature: 0.1, responseMimeType: "application/json" },
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message ?? "Gemini call failed");
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}
