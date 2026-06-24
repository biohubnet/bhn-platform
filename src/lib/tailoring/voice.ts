/**
 * Human-voice rules (rule 9) + house style (rule 11), as deterministic
 * checks. Used both as a drafting instruction (the banned list goes
 * into the prompt) and as a hard QA gate (the verifier runs these).
 */

/** AI-tell verbs to ban. Allowed only inside a proper noun (e.g. the
 *  credential "Search Engine Optimization Certificate" is fine). */
export const BANNED_WORDS = [
  "spearheaded", "orchestrated", "leveraged", "leverage", "leveraging",
  "optimized", "optimize", "optimizing", "utilized", "utilize", "utilizing",
  "pioneered", "championed", "spearhead", "synergy", "synergies",
  "delve", "delved", "tapestry", "testament", "showcasing", "underscore",
  "seamless", "seamlessly", "robust", "myriad", "plethora", "facilitate",
  "facilitated", "spearheading",
];

/** Phrases where a banned word is part of a legitimate proper noun and
 *  should NOT be flagged. */
const ALLOW_PHRASES = [
  "search engine optimization",
];

export function findBannedWords(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = new Set<string>();
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w}\\b`, "i");
    const m = re.exec(lower);
    if (!m) continue;
    // Skip if the match sits inside an allow-listed phrase.
    const around = lower.slice(Math.max(0, m.index - 30), m.index + w.length + 30);
    if (ALLOW_PHRASES.some((p) => around.includes(p))) continue;
    hits.add(w);
  }
  return [...hits];
}

/** Em dash (—) and en dash used as punctuation — banned in resumes. */
export function findEmDashes(text: string): boolean {
  return /[—–]/.test(text);
}

/** Pipe characters — banned anywhere (they break ATS parsing). */
export function findPipes(text: string): boolean {
  return text.includes("|");
}

/** Rough page estimate for a resume body. ~525 words ≈ 1 full page in
 *  Arial 10.5 with standard margins; we target 2 genuinely-full pages. */
export function estimatePages(words: number): number {
  return Math.round((words / 525) * 10) / 10;
}

export function wordCount(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length;
}
