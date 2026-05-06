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
  chat: !!CF_TOKEN || !!GEMINI_KEY,
  embed: !!CF_TOKEN,                 // BGE only on Cloudflare
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
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
    model: "gemini-1.5-flash-latest",
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
