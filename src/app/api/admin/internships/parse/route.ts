import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { chat, AI_CONFIGURED } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  // The model sometimes wraps in ```json fences despite instructions —
  // strip them defensively before JSON.parse.
  const raw = result.text
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
