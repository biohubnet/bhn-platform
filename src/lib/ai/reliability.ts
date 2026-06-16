/**
 * Reliability layer over chat() (src/lib/ai/index.ts). On top of the built-in
 * Cloudflare -> Gemini provider fallback it adds:
 *   - retries with exponential backoff for transient failures,
 *   - a per-call timeout (passed through to the provider fetch via AbortSignal),
 *   - zod schema validation of structured (JSON) outputs, with a single
 *     repair-retry then a fail-safe typed error (never throws),
 *   - prompt-version pinning + the validation result recorded in telemetry.
 *
 * Use callText() for prose answers and callStructured() when you need a typed,
 * schema-validated object. RAG callers should run untrusted retrieved text
 * through delimitContext() first (prompt-injection defense).
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { chat, type ChatMessage } from "./index";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ReliableOpts {
  userId?: string | null;
  feature: string;
  promptVersion?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Total attempts including the first (default 3 for text, 2 for structured). */
  retries?: number;
}

/** Prose answer with retry + exponential backoff + timeout. Returns the
 *  telemetry row id so callers can attach confidence / review flags / ratings. */
export async function callText(
  messages: ChatMessage[],
  opts: ReliableOpts,
): Promise<{ ok: true; text: string; interactionId: string | null } | { ok: false; error: string }> {
  const attempts = Math.max(1, opts.retries ?? 3);
  let lastErr = "AI not configured";
  for (let i = 0; i < attempts; i++) {
    const r = await chat(messages, {
      userId: opts.userId,
      feature: opts.feature,
      promptVersion: opts.promptVersion,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      timeoutMs: opts.timeoutMs,
    });
    if (r.ok && r.text.trim()) return { ok: true, text: r.text, interactionId: r.interactionId };
    lastErr = r.ok ? "Empty response" : r.error;
    if (i < attempts - 1) await sleep(250 * 2 ** i); // 250ms, 500ms, 1s, …
  }
  return { ok: false, error: lastErr };
}

/** Cheap groundedness/confidence proxy: share of the answer's content words
 *  present in the provided context. Used to flag low-confidence RAG answers. */
export function groundednessConfidence(answer: string, context: string): number {
  const toks = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 3);
  const ctx = new Set(toks(context));
  const a = toks(answer);
  if (a.length === 0) return 0;
  return Math.round((a.filter((t) => ctx.has(t)).length / a.length) * 100) / 100;
}

/** Extract the first balanced JSON object/array from a model response. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) return undefined;
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < body.length; i++) {
    if (body[i] === open) depth++;
    else if (body[i] === close) {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(body.slice(start, i + 1)); } catch { return undefined; }
      }
    }
  }
  return undefined;
}

/**
 * Typed, schema-validated structured output. On invalid output it retries once
 * with a repair instruction, then fails safe with ok:false (never throws), and
 * records validationPassed on the call's telemetry row.
 */
export async function callStructured<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  opts: ReliableOpts,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const attempts = Math.max(1, opts.retries ?? 2);
  let lastErr = "No valid response";
  let convo = messages;
  for (let i = 0; i < attempts; i++) {
    const r = await chat(convo, {
      userId: opts.userId,
      feature: opts.feature,
      promptVersion: opts.promptVersion,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature ?? 0.2,
      timeoutMs: opts.timeoutMs,
    });
    if (!r.ok) {
      lastErr = r.error;
      if (i < attempts - 1) await sleep(250 * 2 ** i);
      continue;
    }
    const parsed = schema.safeParse(extractJson(r.text));
    if (r.interactionId) {
      await prisma.aIInteraction
        .update({ where: { id: r.interactionId }, data: { validationPassed: parsed.success } })
        .catch(() => {});
    }
    if (parsed.success) return { ok: true, data: parsed.data };
    lastErr =
      "Schema validation failed: " +
      parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).slice(0, 3).join("; ");
    // Repair-retry once: show the model its own bad output + the error.
    convo = [
      ...messages,
      { role: "assistant", content: r.text.slice(0, 1500) },
      {
        role: "user",
        content: `That response did not match the required JSON schema (${lastErr}). Reply with ONLY valid JSON matching the schema — no prose, no code fences.`,
      },
    ];
  }
  return { ok: false, error: lastErr };
}

/**
 * Prompt-injection defense for RAG: neutralize instruction-like lines in
 * untrusted retrieved text and cap length, so retrieved content can't hijack
 * the system prompt. Pair with a system rule that the delimited block is
 * data-only (see src/lib/ai/prompts.ts COURSE_TUTOR).
 */
export function sanitizeRagContext(text: string, maxChars = 6000): string {
  return text
    .slice(0, maxChars)
    .split("\n")
    .map((line) =>
      /\b(ignore|disregard|forget)\b.{0,30}\b(previous|prior|above|earlier|all)\b.{0,40}\b(instruction|prompt|rule|context|system)/i.test(line) ||
      /^\s*(system|assistant|developer)\s*:/i.test(line)
        ? "[redacted]"
        : line,
    )
    .join("\n");
}

/** Wrap untrusted context in tags the system prompt declares data-only. */
export function delimitContext(label: string, body: string): string {
  return `<${label}>\n${sanitizeRagContext(body)}\n</${label}>`;
}
