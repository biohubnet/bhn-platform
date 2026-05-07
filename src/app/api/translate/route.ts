import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;
const CF_TOKEN   = process.env.CF_AI_TOKEN;
const ALLOWED = new Set(["en", "es", "fr", "zh", "hi", "ko"]);

interface Body {
  texts: string[];
  source?: string;
  target: string;
}

/**
 * Translate an array of strings via Cloudflare m2m100. Returns same-length
 * array of translations. Failures are returned as the original text so the
 * UI can fall back gracefully. Logged in AIInteraction.
 */
export async function POST(req: NextRequest) {
  if (!CF_TOKEN || !CF_ACCOUNT) {
    return NextResponse.json({ error: "Translation not configured." }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<Body>;
  const texts = Array.isArray(body.texts) ? body.texts : [];
  const source = (body.source ?? "en").toLowerCase();
  const target = (body.target ?? "").toLowerCase();
  if (!ALLOWED.has(target)) {
    return NextResponse.json({ error: "Unsupported target language" }, { status: 400 });
  }
  if (target === source) {
    return NextResponse.json({ translated: texts });
  }
  if (texts.length === 0) {
    return NextResponse.json({ translated: [] });
  }
  if (texts.length > 80) {
    return NextResponse.json({ error: "Batch too large (max 80)" }, { status: 400 });
  }

  const session = await getSession();
  const userId = (session?.user as { id?: string })?.id ?? null;
  const start = Date.now();

  // m2m100 takes one text per call. Run with controlled concurrency.
  async function translateOne(text: string): Promise<string> {
    if (!text || text.trim().length < 2) return text;
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/m2m100-1.2b`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text, source_lang: source, target_lang: target }),
      }
    );
    const j = await res.json();
    if (!j.success) return text;
    return (j.result?.translated_text as string | undefined) ?? text;
  }

  const concurrency = 6;
  const out: string[] = new Array(texts.length).fill("");
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= texts.length) return;
      out[i] = await translateOne(texts[i]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Single aggregate log entry per batch — keeps the table readable
  await prisma.aIInteraction.create({
    data: {
      userId,
      kind: "translate",
      provider: "cloudflare",
      model: "m2m100-1.2b",
      latencyMs: Date.now() - start,
      success: true,
    },
  }).catch(() => {});

  return NextResponse.json({ translated: out, target });
}
