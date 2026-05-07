/**
 * Thin AI adapter. One module, two providers, three operations:
 *   chat()  — generate text from a message list (system+user)
 *   embed() — turn text into 384-d vectors (Cloudflare BGE small)
 *   classify() — score text against a list of labels (zero-shot via chat)
 *
 * Every call is logged in AIInteraction with provider, model, latency,
 * success, optional token counts. Failures never throw — they return a
 * structured error so feature code can degrade gracefully.
 */
import { prisma } from "@/lib/prisma";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;
const CF_TOKEN   = process.env.CF_AI_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

export const AI_CONFIGURED = {
  chat:  !!CF_TOKEN || !!GEMINI_KEY,
  embed: !!CF_TOKEN,                 // BGE only on Cloudflare
  image: !!CF_TOKEN,                 // SDXL Lightning on Cloudflare
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface BaseOpts {
  userId?: string | null;
  feature?: string;       // e.g. "course_search", "course_summary", "course_tutor"
}
interface ChatOpts extends BaseOpts {
  maxTokens?: number;
  temperature?: number;
}
interface EmbedOpts extends BaseOpts {
  /** override model — defaults to bge-small-en-v1.5 (384d). */
  model?: "@cf/baai/bge-small-en-v1.5" | "@cf/baai/bge-base-en-v1.5";
}

async function logInteraction(input: {
  userId?: string | null;
  kind: string;
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await prisma.aIInteraction.create({
      data: {
        userId: input.userId ?? null,
        kind: input.kind,
        provider: input.provider,
        model: input.model,
        promptTokens: input.promptTokens ?? null,
        completionTokens: input.completionTokens ?? null,
        latencyMs: input.latencyMs,
        success: input.success,
        errorMessage: input.errorMessage ?? null,
      },
    });
  } catch (e) {
    console.error("AI log failed:", (e as Error).message);
  }
}

/** Cloudflare Llama for chat. */
async function chatCloudflare(messages: ChatMessage[], opts: ChatOpts) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        max_tokens: opts.maxTokens ?? 512,
        temperature: opts.temperature ?? 0.5,
      }),
    }
  );
  const j = await res.json();
  if (!j.success) throw new Error(j.errors?.[0]?.message ?? "Cloudflare AI call failed");
  return {
    text: (j.result?.response ?? "") as string,
    promptTokens: j.result?.usage?.prompt_tokens as number | undefined,
    completionTokens: j.result?.usage?.completion_tokens as number | undefined,
    model: "llama-3.1-8b-instruct",
  };
}

/** Gemini Flash fallback. Cheap, fast, multimodal-capable (text-only here). */
async function chatGemini(messages: ChatMessage[], opts: ChatOpts) {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const conversational = messages.filter((m) => m.role !== "system");
  const lastUser = conversational[conversational.length - 1]?.content ?? "";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
        contents: [{ role: "user", parts: [{ text: lastUser }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens ?? 512, temperature: opts.temperature ?? 0.5 },
      }),
    }
  );
  const j = await res.json();
  if (j.error) throw new Error(j.error.message ?? "Gemini call failed");
  return {
    text: (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string,
    promptTokens: j.usageMetadata?.promptTokenCount as number | undefined,
    completionTokens: j.usageMetadata?.candidatesTokenCount as number | undefined,
    model: "gemini-2.0-flash",
  };
}

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}) {
  const start = Date.now();
  const provider = CF_TOKEN ? "cloudflare" : (GEMINI_KEY ? "gemini" : null);
  if (!provider) {
    return { ok: false as const, error: "AI not configured", text: "" };
  }
  try {
    const result = provider === "cloudflare"
      ? await chatCloudflare(messages, opts)
      : await chatGemini(messages, opts);
    await logInteraction({
      userId: opts.userId,
      kind: opts.feature ?? "chat",
      provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: Date.now() - start,
      success: true,
    });
    return { ok: true as const, text: result.text };
  } catch (e) {
    const err = (e as Error).message;
    await logInteraction({
      userId: opts.userId,
      kind: opts.feature ?? "chat",
      provider,
      model: "unknown",
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: err,
    });
    return { ok: false as const, error: err, text: "" };
  }
}

/**
 * Embed an array of strings into 384-d vectors. Returns null on failure.
 * Always batched for efficiency — Cloudflare allows up to 100 strings per call.
 */
export async function embed(texts: string[], opts: EmbedOpts = {}): Promise<number[][] | null> {
  if (!CF_TOKEN || texts.length === 0) return null;
  const start = Date.now();
  const model = opts.model ?? "@cf/baai/bge-small-en-v1.5";
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: texts }),
      }
    );
    const j = await res.json();
    if (!j.success) throw new Error(j.errors?.[0]?.message ?? "embed failed");
    const vectors = j.result?.data as number[][];
    await logInteraction({
      userId: opts.userId,
      kind: opts.feature ?? "embed",
      provider: "cloudflare",
      model: model.replace("@cf/baai/", ""),
      latencyMs: Date.now() - start,
      success: true,
    });
    return vectors;
  } catch (e) {
    await logInteraction({
      userId: opts.userId,
      kind: opts.feature ?? "embed",
      provider: "cloudflare",
      model: model.replace("@cf/baai/", ""),
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: (e as Error).message,
    });
    return null;
  }
}

/** Format a number[] into a Postgres pgvector literal: `[0.1, 0.2, …]`. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

interface ImageOpts extends BaseOpts {
  /** Stable Diffusion sampling steps. SDXL Lightning is sharp at 4–8. */
  steps?: number;
  negativePrompt?: string;
}

/**
 * Generate an image from a text prompt. Returns raw PNG bytes (Uint8Array)
 * suitable for streaming straight into R2, or null on failure.
 */
export async function generateImage(prompt: string, opts: ImageOpts = {}): Promise<Uint8Array | null> {
  if (!CF_TOKEN) return null;
  const start = Date.now();
  const model = "@cf/bytedance/stable-diffusion-xl-lightning";
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          num_steps: opts.steps ?? 8,
          negative_prompt:
            opts.negativePrompt ??
            "text, words, letters, watermark, signature, low quality, blurry, distorted, ugly",
        }),
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Image gen failed: ${res.status} ${t.slice(0, 200)}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    await logInteraction({
      userId: opts.userId,
      kind: opts.feature ?? "image",
      provider: "cloudflare",
      model: "sdxl-lightning",
      latencyMs: Date.now() - start,
      success: true,
    });
    return buf;
  } catch (e) {
    await logInteraction({
      userId: opts.userId,
      kind: opts.feature ?? "image",
      provider: "cloudflare",
      model: "sdxl-lightning",
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: (e as Error).message,
    });
    return null;
  }
}

/**
 * Build a styled prompt for course/pathway thumbnails. Tries to align with
 * a clean, modern, brand-blue editorial aesthetic — no text, no people,
 * no logos. Subjects are bioprocess/scientific themes.
 */
export function buildThumbnailPrompt(input: {
  title: string;
  description?: string | null;
  category?: string | null;
}): string {
  const subject = [input.category, input.title].filter(Boolean).join(" — ");
  const desc = input.description ? ` (${input.description.slice(0, 200)})` : "";
  return (
    `Editorial illustration for a biomanufacturing training module. ` +
    `Subject: ${subject}${desc}. ` +
    `Style: minimal, abstract, geometric, soft gradients in deep blues with hints of violet and cyan, ` +
    `subtle scientific motifs (waves, curves, particles, molecular shapes), ` +
    `clean composition with negative space, premium magazine-cover feel, ` +
    `flat vector aesthetic, no text, no logo, no people.`
  );
}

// Words that don't carry meaning on their own — strip them when picking
// the single representative word from a course title.
const STOPWORDS = new Set([
  "a","an","the","of","in","for","and","or","to","with","on","at","by","from",
  "is","are","be","this","that","into","onto","via","as","its","it",
  "intro","introduction","basics","basic","advanced","essential","essentials",
  "fundamentals","fundamental","overview","module","modules","series","training",
  "course","courses","program","programme","section","part","level",
  "i","ii","iii","iv","v","vi",
]);

/**
 * Pick a single word from a course's title (or category, if set) that
 * mostly represents what the course is about. Used as a thumbnail-prompt
 * subject so SDXL can paint a focused, abstract take on it.
 */
export function chooseOneWord(input: { title: string; category?: string | null }): string {
  // Prefer category — typically already a single domain word ("Cleanroom").
  if (input.category) {
    const cat = input.category.split(/\s+/).find((w) => !STOPWORDS.has(w.toLowerCase()));
    if (cat) return cat.replace(/[^A-Za-z\-]/g, "").toLowerCase() || "biomanufacturing";
  }
  // Otherwise, first significant word of the title.
  const tokens = input.title.split(/\s+/).map((w) => w.replace(/[^A-Za-z\-]/g, ""));
  const pick = tokens.find((w) => w && !STOPWORDS.has(w.toLowerCase()));
  return (pick ?? "biomanufacturing").toLowerCase();
}

/**
 * Build a thumbnail prompt anchored on a single representative word.
 * Same editorial brand language as buildThumbnailPrompt, but the SDXL
 * model gets a tighter focal subject so output is more iconic.
 */
export function buildOneWordThumbnailPrompt(word: string): string {
  return (
    `Editorial illustration representing the concept of "${word}" for a biomanufacturing training catalog. ` +
    `Style: minimal, abstract, geometric, soft gradients in deep blues with hints of violet and cyan, ` +
    `subtle scientific motifs (waves, curves, particles, molecular shapes) suggestive of the subject, ` +
    `clean composition with negative space, premium magazine-cover feel, ` +
    `flat vector aesthetic, no text, no logo, no people.`
  );
}
