/**
 * Per-model pricing so every AI call records an estimated USD cost on its
 * telemetry row (AIInteraction.costUsd). Prices are per 1M tokens; approximate
 * provider list prices — keep roughly in sync. Unknown model → null cost.
 */
export interface ModelPrice {
  inPerM: number;
  outPerM: number;
}

export const MODEL_PRICING: Record<string, ModelPrice> = {
  // Cloudflare Workers AI — Llama 3.3 70B fp8-fast (approx list price)
  "llama-3.3-70b-instruct-fp8-fast": { inPerM: 0.29, outPerM: 2.25 },
  // Google Gemini 2.0 Flash
  "gemini-2.0-flash": { inPerM: 0.1, outPerM: 0.4 },
};

export function computeCostUsd(
  model: string,
  promptTokens?: number | null,
  completionTokens?: number | null,
): number | null {
  const price = MODEL_PRICING[model];
  if (!price) return null;
  const cost =
    ((promptTokens ?? 0) / 1_000_000) * price.inPerM +
    ((completionTokens ?? 0) / 1_000_000) * price.outPerM;
  return Math.round(cost * 1e6) / 1e6; // 6 dp of a dollar
}
