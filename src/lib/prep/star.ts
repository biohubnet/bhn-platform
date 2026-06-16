/**
 * STAR-story helpers.
 *
 * Two pieces of value:
 *
 *   1. validateStarStructure() — deterministic, client-runnable
 *      structural feedback on a STAR draft. No AI required. Used to
 *      power the always-on coaching layer (word counts, quantified-
 *      result detection, first-person hints, top-3 tips).
 *
 *   2. polishStarStory() — opt-in AI revision pass. Takes the four
 *      fields + the user's intent (e.g. "make this 30% shorter while
 *      keeping the result quantified") and returns a single suggested
 *      revision. The trainee picks accept / reject; we keep the
 *      previous text either way.
 */

import type { StarFeedback } from "./types";
import { z } from "zod";
import { callStructured } from "@/lib/ai/reliability";

const NUMBER_OR_PERCENT = /(\d+\.?\d*\s*%|\d{2,}|reduced|increased|cut|saved|improved|delivered)/i;
const FIRST_PERSON = /\bI\s|\bI'/;
const WE_HEAVY = /\bwe\s/gi;

interface StarFields {
  situation: string;
  task: string;
  action: string;
  result: string;
}

const TARGETS = {
  situation: { min: 30, max: 80 },
  task:      { min: 15, max: 50 },
  action:    { min: 60, max: 150 },
  result:    { min: 25, max: 80 },
};

const FIELD_LABEL: Record<keyof StarFields, string> = {
  situation: "Situation",
  task: "Task",
  action: "Action",
  result: "Result",
};

/**
 * Validate STAR structure heuristically. Deterministic + offline.
 * Output drives the inline coaching strip the user sees while typing.
 */
export function validateStarStructure(fields: StarFields): StarFeedback {
  function count(s: string): number {
    return s.trim().split(/\s+/).filter(Boolean).length;
  }
  const wc = {
    situation: count(fields.situation),
    task: count(fields.task),
    action: count(fields.action),
    result: count(fields.result),
  };
  const totalWords = wc.situation + wc.task + wc.action + wc.result;

  function nudgeFor(k: keyof StarFields, words: number): string | undefined {
    const t = TARGETS[k];
    if (words === 0) return `${FIELD_LABEL[k]} is empty — at least a sentence so the listener has context.`;
    if (words < t.min) return `${FIELD_LABEL[k]} is light (${words} words) — aim for ${t.min}–${t.max}.`;
    if (words > t.max) return `${FIELD_LABEL[k]} is long (${words} words) — trim toward ${t.max}.`;
    return undefined;
  }

  const perField: StarFeedback["perField"] = {
    situation: { words: wc.situation, nudge: nudgeFor("situation", wc.situation) },
    task:      { words: wc.task,      nudge: nudgeFor("task",      wc.task) },
    action:    { words: wc.action,    nudge: nudgeFor("action",    wc.action) },
    result:    { words: wc.result,    nudge: nudgeFor("result",    wc.result) },
  };

  const hasQuantifiedResult = NUMBER_OR_PERCENT.test(fields.result);
  const usesFirstPerson = FIRST_PERSON.test(fields.action);

  const weCountInAction = (fields.action.match(WE_HEAVY) ?? []).length;
  const iCountInAction = (fields.action.match(/\bI\s|\bI'/gi) ?? []).length;
  const tooMuchWe = weCountInAction > iCountInAction + 1;

  const tips: string[] = [];
  if (!hasQuantifiedResult) {
    tips.push(
      "The Result section reads qualitative — try to add at least one number (a %, a count, a time saved, a yield).",
    );
  }
  if (!usesFirstPerson) {
    tips.push(
      "The Action section doesn't use 'I' — interviewers want to hear what YOU did, not what the team did.",
    );
  } else if (tooMuchWe) {
    tips.push(
      "Action section leans on 'we' — flip a couple of those into 'I' so the interviewer can locate your contribution.",
    );
  }
  if (wc.action < TARGETS.action.min) {
    tips.push(
      "Action is the bulk of a STAR story — bring it up to 60–150 words; that's where the interviewer learns how you think.",
    );
  }
  if (totalWords < 150) {
    tips.push(
      `Total is ${totalWords} words — most STAR stories land between 200 and 360. Below 150 risks feeling thin.`,
    );
  }
  if (totalWords > 420) {
    tips.push(
      `Total is ${totalWords} words — anything past 400 risks losing the interviewer. Trim toward 240–320.`,
    );
  }

  let readiness: StarFeedback["readiness"] = "needs-work";
  const allFieldsAtLeastMinimal =
    wc.situation >= TARGETS.situation.min &&
    wc.task >= TARGETS.task.min &&
    wc.action >= TARGETS.action.min &&
    wc.result >= TARGETS.result.min;
  if (allFieldsAtLeastMinimal && hasQuantifiedResult && usesFirstPerson) {
    readiness = "ready";
  } else if (allFieldsAtLeastMinimal) {
    readiness = "almost";
  }

  return {
    totalWords,
    perField,
    hasQuantifiedResult,
    usesFirstPerson,
    readiness,
    tips: tips.slice(0, 3),
  };
}

/**
 * Schema for the AI polish output. All four fields are required and must be
 * non-empty — mirrors the original `if (!parsed.situation || ...) return null`
 * guard, which rejected both missing and empty-string values.
 */
const PolishedStarSchema = z.object({
  situation: z.string().min(1),
  task: z.string().min(1),
  action: z.string().min(1),
  result: z.string().min(1),
});

/**
 * AI-polish a STAR story. Takes the four fields + an optional
 * coaching prompt and returns a single revision suggestion. Never
 * mutates the user's draft — the UI presents accept / reject.
 *
 * Failure modes: AI returns garbage / not configured → return null.
 * Callers handle that as "we couldn't polish; here's why" — the UI
 * never auto-replaces the user's text on a failed polish.
 */
export async function polishStarStory(
  fields: StarFields,
  intent: string | undefined,
  userId: string,
): Promise<{ situation: string; task: string; action: string; result: string } | null> {
  const system =
    "You are a careful interview coach. The candidate has drafted a STAR story. " +
    "Tighten it — clarify, quantify the Result if at all possible, ensure the Action " +
    "is in first person, and trim flab. Keep the candidate's voice; do NOT invent facts. " +
    "If a quantity isn't in the source, do NOT make one up — instead phrase it as an " +
    "honest qualitative outcome. " +
    "Output STRICT JSON only — no markdown — matching:\n" +
    `{ "situation": string, "task": string, "action": string, "result": string }\n\n` +
    "Target word counts: Situation 30–80 · Task 15–50 · Action 60–150 · Result 25–80.";

  const userPrompt =
    (intent ? `Intent: ${intent}\n\n` : "") +
    `Situation: ${fields.situation}\n\n` +
    `Task: ${fields.task}\n\n` +
    `Action: ${fields.action}\n\n` +
    `Result: ${fields.result}\n\n` +
    `Return the JSON now.`;

  const r = await callStructured(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    PolishedStarSchema,
    { feature: "prep.star-polish", userId, temperature: 0.4, maxTokens: 800 },
  );

  if (!r.ok) return null;
  const parsed = r.data;
  return {
    situation: String(parsed.situation).slice(0, 800),
    task:      String(parsed.task).slice(0, 600),
    action:    String(parsed.action).slice(0, 1600),
    result:    String(parsed.result).slice(0, 800),
  };
}
