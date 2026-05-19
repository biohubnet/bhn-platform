/**
 * Generate a SimulationPayload from cleaned JD text.
 *
 * Provider strategy:
 *   1. Gemini Flash if GEMINI_API_KEY is set — best quality for the
 *      nuanced workplace dialogue this feature needs, generous free tier.
 *   2. Cloudflare Workers AI (Llama 3.3 70B Instruct fast) otherwise —
 *      already configured in BHN, free tier covers ~30–60 sims/day, and
 *      degrades gracefully when Gemini hits its daily cap.
 *
 * Every call is logged via the same AIInteraction table that the rest
 * of BHN uses, so admins can see simulator spend alongside everything
 * else.
 */
import { prisma } from "@/lib/prisma";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { extractJsonObject, validatePayload } from "./validate";
import type { SimulationPayload } from "./types";

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_AI_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

export type GenerateResult =
  | {
      ok: true;
      payload: SimulationPayload;
      modelUsed: string;
      generationMs: number;
    }
  | { ok: false; error: string };

export async function generateSimulation(
  jdText: string,
  userId?: string | null,
): Promise<GenerateResult> {
  if (!GEMINI_KEY && !CF_TOKEN) {
    return {
      ok: false,
      error:
        "AI is not configured on this environment. Set GEMINI_API_KEY or CF_AI_TOKEN.",
    };
  }

  // Try Gemini first when available; fall back to Cloudflare.
  const providers: Array<"gemini" | "cloudflare"> = [];
  if (GEMINI_KEY) providers.push("gemini");
  if (CF_TOKEN) providers.push("cloudflare");

  let lastError = "";
  for (const provider of providers) {
    const attempt = await runProvider(provider, jdText, userId ?? null);
    if (attempt.ok) return attempt;
    lastError = attempt.error;
    // Fall through to the next provider.
  }
  return { ok: false, error: lastError || "All providers failed" };
}

async function runProvider(
  provider: "gemini" | "cloudflare",
  jdText: string,
  userId: string | null,
): Promise<GenerateResult> {
  const start = Date.now();
  const userPrompt = buildUserPrompt(jdText);
  try {
    let raw: string;
    let modelLabel: string;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;

    if (provider === "gemini") {
      const r = await callGemini(SYSTEM_PROMPT, userPrompt);
      raw = r.text;
      modelLabel = r.model;
      promptTokens = r.promptTokens;
      completionTokens = r.completionTokens;
    } else {
      const r = await callCloudflare(SYSTEM_PROMPT, userPrompt);
      raw = r.text;
      modelLabel = r.model;
      promptTokens = r.promptTokens;
      completionTokens = r.completionTokens;
    }

    const json = extractJsonObject(raw);
    if (!json) throw new Error("Model did not return parseable JSON");

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new Error(`JSON parse failed: ${(e as Error).message}`);
    }

    const validated = validatePayload(parsed);
    if (!validated.ok) throw new Error(`Schema invalid: ${validated.error}`);

    const generationMs = Date.now() - start;
    await logAi({
      userId,
      kind: "simulator_generate",
      provider,
      model: modelLabel,
      promptTokens,
      completionTokens,
      latencyMs: generationMs,
      success: true,
    });

    return {
      ok: true,
      payload: validated.payload,
      modelUsed: `${provider}:${modelLabel}`,
      generationMs,
    };
  } catch (e) {
    const error = (e as Error).message ?? "unknown";
    await logAi({
      userId,
      kind: "simulator_generate",
      provider,
      model: provider === "gemini" ? "gemini-2.0-flash" : "llama-3.3-70b",
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: error,
    });
    return { ok: false, error };
  }
}

// ────────────────────────────────────────────────────────────────────
// Provider implementations
// ────────────────────────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string) {
  const model = "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 8192,
          // Forcing JSON output dramatically cuts down on "Sure! Here's…" preambles.
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  const j = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    error?: { message?: string };
  };
  if (j.error) throw new Error(j.error.message ?? "Gemini error");
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty text");
  return {
    text,
    model,
    promptTokens: j.usageMetadata?.promptTokenCount,
    completionTokens: j.usageMetadata?.candidatesTokenCount,
  };
}

async function callCloudflare(systemPrompt: string, userPrompt: string) {
  // Llama 3.3 70B Instruct (fast variant) — best Workers AI model for
  // creative-writing-style outputs. Falls back to the 8B if 70B is
  // disabled on the account.
  const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );
  const j = (await res.json()) as {
    success?: boolean;
    result?: {
      response?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    errors?: Array<{ message?: string }>;
  };
  if (!j.success) {
    throw new Error(j.errors?.[0]?.message ?? "Cloudflare AI error");
  }
  const text = j.result?.response ?? "";
  if (!text) throw new Error("Cloudflare returned empty text");
  return {
    text,
    model: "llama-3.3-70b-instruct",
    promptTokens: j.result?.usage?.prompt_tokens,
    completionTokens: j.result?.usage?.completion_tokens,
  };
}

async function logAi(input: {
  userId: string | null;
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
        userId: input.userId,
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
    console.error("Simulator AI log failed:", (e as Error).message);
  }
}
