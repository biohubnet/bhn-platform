/**
 * Eval harness runner. Scores the AI tutor + retrieval against the golden
 * datasets and emits evals/report.json + evals/report.md.
 *
 *   npx tsx evals/run.ts                 full run (LLM judge if AI keys present)
 *   npx tsx evals/run.ts --no-llm        deterministic only (retrieval + dataset checks)
 *   npx tsx evals/run.ts --check         exit 1 if any metric drops > tolerance vs baseline
 *   npx tsx evals/run.ts --write-baseline   overwrite evals/baseline.json with this run
 *   npx tsx evals/run.ts --save          persist an EvalRun row (needs DATABASE_URL)
 *
 * The deterministic path (--no-llm) has no AI/DB dependency, so CI runs it on
 * every PR as a regression gate; a full run with secrets adds LLM-judge
 * correctness/grounding. See evals/README.md.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { rankByOverlap, type Doc } from "./retriever";
import { recallAtK, precisionAtK, mrr, keywordScore, groundednessLexical, avg } from "./scorers";

const ROOT = process.cwd();
const DATA = join(ROOT, "evals", "datasets");
const ARGS = new Set(process.argv.slice(2));
const HAS_KEYS = !!process.env.CF_AI_TOKEN || !!process.env.GEMINI_API_KEY;
const NO_LLM = ARGS.has("--no-llm") || !HAS_KEYS;
const TOLERANCE = 0.05;
const K = 3;

interface RetrievalCase { id: string; query: string; corpus: Doc[]; relevantIds: string[] }
interface TutorCase { id: string; question: string; context: string; referenceAnswer: string; mustInclude?: string[]; mustNotInclude?: string[] }

function readJsonl<T>(file: string): T[] {
  return readFileSync(join(DATA, file), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as T);
}
const round = (n: number) => Math.round(n * 1000) / 1000;

async function main() {
  const scores: Record<string, number> = {};

  // ── Retrieval (deterministic) ─────────────────────────────────────────
  const rcases = readJsonl<RetrievalCase>("retrieval.jsonl");
  const recalls: number[] = [], precs: number[] = [], mrrs: number[] = [];
  for (const c of rcases) {
    const ranked = rankByOverlap(c.query, c.corpus);
    recalls.push(recallAtK(ranked, c.relevantIds, K));
    precs.push(precisionAtK(ranked, c.relevantIds, K));
    mrrs.push(mrr(ranked, c.relevantIds));
  }
  scores[`recallAt${K}`] = round(avg(recalls));
  scores[`precisionAt${K}`] = round(avg(precs));
  scores.mrr = round(avg(mrrs));

  // ── Tutor (deterministic keyword/grounding; + LLM judge if available) ──
  const tcases = readJsonl<TutorCase>("tutor.jsonl");
  const keyword: number[] = [], grounded: number[] = [], correctness: number[] = [], judgeGround: number[] = [];
  let llmRan = false;

  if (NO_LLM) {
    // No model to generate answers — score the reference answers against their
    // own keywords/context. Guards the dataset + scorers (a CI-safe signal).
    for (const c of tcases) {
      keyword.push(keywordScore(c.referenceAnswer, c.mustInclude, c.mustNotInclude));
      grounded.push(groundednessLexical(c.referenceAnswer, c.context));
    }
  } else {
    try {
      const { callText } = await import("@/lib/ai/reliability");
      const { COURSE_TUTOR } = await import("@/lib/ai/prompts");
      const { judge } = await import("./judge");
      for (const c of tcases) {
        const gen = await callText(
          [
            { role: "system", content: COURSE_TUTOR.system },
            { role: "user", content: `<course_context>\n${c.context}\n</course_context>\n\nLearner's question: ${c.question}` },
          ],
          { feature: "eval_tutor", promptVersion: COURSE_TUTOR.version, maxTokens: 400, temperature: 0.2 },
        );
        const ans = gen.ok ? gen.text : "";
        keyword.push(keywordScore(ans, c.mustInclude, c.mustNotInclude));
        grounded.push(groundednessLexical(ans, c.context));
        const j = await judge(c.question, c.referenceAnswer, ans);
        if (j) { correctness.push(j.correctness); judgeGround.push(j.groundedness); }
      }
      llmRan = correctness.length > 0;
    } catch (e) {
      console.warn("LLM eval skipped:", (e as Error).message);
    }
  }
  scores.keyword = round(avg(keyword));
  scores.groundedness = round(avg(grounded));
  if (llmRan) { scores.correctness = round(avg(correctness)); scores.judgeGroundedness = round(avg(judgeGround)); }

  // ── Triage agent eval (LLM only): category-classification accuracy ──────
  if (!NO_LLM) {
    try {
      const { triageAnswer } = await import("@/lib/ai/triage");
      const tr = readJsonl<{ id: string; answer: string; reason: string; expectedCategory: string }>("triage.jsonl");
      const correct: number[] = [];
      for (const c of tr) {
        const res = await triageAnswer({ answer: c.answer, reason: c.reason });
        correct.push(res && res.category === c.expectedCategory ? 1 : 0);
      }
      if (correct.length) scores.triageAccuracy = round(avg(correct));
    } catch (e) {
      console.warn("Agent triage eval skipped:", (e as Error).message);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────
  const mode = llmRan ? "full (LLM judge)" : "deterministic";
  const lines = Object.entries(scores).map(([k, v]) => `- **${k}**: ${v.toFixed(3)}`);
  const md = `# Eval report\n\nMode: ${mode} · retrieval cases: ${rcases.length} · tutor cases: ${tcases.length}\n\n${lines.join("\n")}\n`;
  writeFileSync(join(ROOT, "evals", "report.json"), JSON.stringify({ mode, scores }, null, 2) + "\n");
  writeFileSync(join(ROOT, "evals", "report.md"), md);
  console.log(md);

  // ── Baseline write / regression check ─────────────────────────────────
  const baselinePath = join(ROOT, "evals", "baseline.json");
  if (ARGS.has("--write-baseline")) {
    writeFileSync(baselinePath, JSON.stringify({ scores, note: "regenerate with: npm run eval:baseline" }, null, 2) + "\n");
    console.log("Wrote baseline.");
  }

  let passed = true;
  let summary = `${mode}; ${Object.entries(scores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(" ")}`;
  if (ARGS.has("--check") && existsSync(baselinePath)) {
    const base = (JSON.parse(readFileSync(baselinePath, "utf8")).scores ?? {}) as Record<string, number>;
    const regressions: string[] = [];
    for (const [k, b] of Object.entries(base)) {
      if (typeof scores[k] === "number" && scores[k] < b - TOLERANCE) {
        regressions.push(`${k}: ${scores[k].toFixed(3)} < baseline ${b.toFixed(3)} (tol ${TOLERANCE})`);
      }
    }
    if (regressions.length) {
      passed = false;
      summary = "REGRESSION — " + regressions.join("; ");
      console.error("\nEVAL REGRESSION:\n" + regressions.map((r) => "  - " + r).join("\n"));
    } else {
      console.log("\nNo regression vs baseline.");
    }
  }

  // ── Persist run history (optional) ────────────────────────────────────
  if (ARGS.has("--save") && process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.evalRun.create({
        data: {
          commitSha: process.env.GITHUB_SHA ?? null,
          trigger: process.env.CI ? "ci" : "local",
          scores,
          passed,
          summary,
        },
      });
      console.log("Saved EvalRun.");
    } catch (e) {
      console.warn("EvalRun save skipped:", (e as Error).message);
    }
  }

  if (!passed) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
