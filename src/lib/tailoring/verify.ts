/**
 * Verify (rule 13) — a hard, deterministic QA gate. Checks page length,
 * banned words, em-dashes, pipes, must-have keyword coverage, and a
 * fabrication trace (every number in the draft must appear in a fact).
 * Pure functions, no AI — same architecture as evals/scorers.ts.
 */
import type { ResumeContent } from "@/lib/resume/types";
import type { QaReport, QaCheck } from "./schemas";
import { findBannedWords, findEmDashes, findPipes, estimatePages, wordCount } from "./voice";
import { resumeText } from "./content";
import { factNumbers, normalizeNum, type Fact } from "./grounding";

export function verifyDraft(args: {
  content: ResumeContent;
  coverText: string;
  mustHaves: string[];
  facts: Fact[];
}): QaReport {
  const checks: QaCheck[] = [];
  const rText = resumeText(args.content);
  const allText = `${rText}\n${args.coverText}`;

  // 1) Resume length — target two genuinely-full pages.
  const words = wordCount(rText);
  const pages = estimatePages(words);
  checks.push({ id: "pages", label: "Resume ≈ 2 full pages", pass: pages >= 1.6 && pages <= 2.3, detail: `${words} words ≈ ${pages} pages` });

  // 2) Banned AI-tell words.
  const banned = findBannedWords(allText);
  checks.push({ id: "banned", label: "No banned words", pass: banned.length === 0, detail: banned.length ? banned.join(", ") : "clean" });

  // 3) Em / en dashes.
  const dash = findEmDashes(allText);
  checks.push({ id: "emdash", label: "No em/en dashes", pass: !dash, detail: dash ? "found — or –" : "clean" });

  // 4) Pipe characters.
  const pipe = findPipes(allText);
  checks.push({ id: "pipes", label: "No pipe characters", pass: !pipe, detail: pipe ? "found |" : "clean" });

  // 5) Must-have keyword coverage (distinctive token of each requirement present).
  const lowerAll = allText.toLowerCase();
  const missing = args.mustHaves.filter((m) => {
    const key = (m.toLowerCase().match(/[a-z][a-z+.#-]{3,}/g) ?? []).sort((a, b) => b.length - a.length)[0];
    return key ? !lowerAll.includes(key) : false;
  });
  checks.push({ id: "keywords", label: "Must-have keywords covered", pass: missing.length === 0, detail: missing.length ? `missing: ${missing.slice(0, 5).join("; ")}` : "all present" });

  // 6) Fabrication trace — every multi-digit number must trace to a fact.
  const allowed = factNumbers(args.facts);
  const draftNums = new Set<string>();
  for (const mm of allText.matchAll(/\d[\d,.]*/g)) draftNums.add(normalizeNum(mm[0]));
  const fabricated = [...draftNums].filter((n) => n.replace(/[.]/g, "").length >= 2 && !allowed.has(n));
  checks.push({ id: "fabrication", label: "Every number traces to a fact", pass: fabricated.length === 0, detail: fabricated.length ? `unverified: ${fabricated.slice(0, 6).join(", ")}` : "all grounded" });

  return { pass: checks.every((c) => c.pass), checks };
}
