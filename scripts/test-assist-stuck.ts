/**
 * Scenario battery for AutoPipette's stuck-hint logic.
 *
 * Exercises the pure, security-critical core in src/lib/assist/stuck-logic.ts:
 *   • buildStuckMenu     — CTA allow-list construction
 *   • validateStuckHint  — untrusted-AI-output sanitisation gauntlet
 *   • resolveStuckQueue  — AI-vs-canned-vs-none decision matrix
 *   • dedupeStatusesFor  — anti-nag de-dupe statuses
 *
 * No DB / AI / env needed — all inputs are synthetic. The live LLM
 * generation quality is out of scope here (non-deterministic); this
 * proves the deterministic plumbing that wraps it.
 *
 * Run: npx tsx scripts/test-assist-stuck.ts
 */
import {
  buildStuckMenu,
  validateStuckHint,
  resolveStuckQueue,
  dedupeStatusesFor,
  type GeneratedHint,
} from "@/lib/assist/stuck-logic";
import type { HelpCard } from "@/lib/assist/help-cards";
import type { Role } from "@/lib/auth";

let pass = 0;
let fail = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  \x1b[31m✗ ${name}\x1b[0m${detail ? `  — ${detail}` : ""}`);
  }
}
function section(t: string) {
  console.log(`\n\x1b[1m${t}\x1b[0m`);
}

// ── A. buildStuckMenu — CTA allow-list safety ────────────────────────
section("A. buildStuckMenu — destination menu + allow-list");
{
  const trainee = buildStuckMenu({ surface: "/experience", role: "trainee" as Role });
  check("A1 menu non-empty for trainee/experience", trainee.menu.length > 0, `${trainee.menu.length}`);
  check("A2 every menu href is an internal absolute path", trainee.menu.every((m) => m.href.startsWith("/")));
  check("A3 every allow entry is an internal absolute path", [...trainee.allow].every((h) => h.startsWith("/")));
  check("A4 safe routes are in the allow-list", ["/dashboard", "/profile", "/courses", "/feedback"].every((r) => trainee.allow.has(r)));
  check("A5 current surface is allow-listed", trainee.allow.has("/experience"));
  check("A6 menu labels are length-capped (≤40)", trainee.menu.every((m) => m.label.length <= 40));

  const employer = buildStuckMenu({ surface: "/employer", role: "employer" as Role });
  check("A7 employer surface yields employer-scoped routes", [...employer.allow].some((h) => h.startsWith("/employer")));

  const noSurface = buildStuckMenu({ surface: null, role: "trainee" as Role });
  check("A8 null surface still yields safe routes", noSurface.allow.has("/dashboard"));
  check("A9 null surface adds nothing odd to allow", [...noSurface.allow].every((h) => h.startsWith("/")));
}

// ── B. validateStuckHint — untrusted output gauntlet ─────────────────
section("B. validateStuckHint — sanitising untrusted model output");
{
  const allow = new Set(["/dashboard", "/courses", "/feedback", "/internships"]);
  const base = {
    stuck: true,
    intent: "applying to a role",
    title: "Trying to apply to that role?",
    body: "Applications open on the company's own site — open the board.",
    ctaLabel: "Open the board",
    ctaHref: "/internships",
    confidence: 0.82,
  };
  const mk = (o: Record<string, unknown>) => JSON.stringify({ ...base, ...o });

  // happy path
  const ok = validateStuckHint(mk({}), allow);
  check("B1 valid response → hint returned", !!ok);
  check("B2 valid CTA in allow-list is kept", ok?.ctaHref === "/internships" && ok?.ctaLabel === "Open the board");

  // CTA safety — the security boundary
  check("B3 unknown internal path → CTA dropped, advice kept", (() => {
    const r = validateStuckHint(mk({ ctaHref: "/totally/made-up" }), allow);
    return !!r && r.ctaHref === null && r.ctaLabel === null;
  })());
  check("B4 external https link → CTA dropped", validateStuckHint(mk({ ctaHref: "https://evil.example.com" }), allow)?.ctaHref === null);
  check("B5 javascript: URI → CTA dropped", validateStuckHint(mk({ ctaHref: "javascript:alert(1)" }), allow)?.ctaHref === null);
  check("B6 protocol-relative //host → CTA dropped", validateStuckHint(mk({ ctaHref: "//evil.example.com" }), allow)?.ctaHref === null);
  check("B7 empty ctaHref → no CTA", validateStuckHint(mk({ ctaHref: "" }), allow)?.ctaHref === null);
  check("B8 valid CTA but missing label → defaults to 'Open'", validateStuckHint(mk({ ctaLabel: undefined }), allow)?.ctaLabel === "Open");
  check("B9 over-long ctaLabel clamped to 28", (validateStuckHint(mk({ ctaLabel: "L".repeat(60) }), allow)?.ctaLabel?.length ?? -1) === 28);

  // gating
  check("B10 stuck:false → null", validateStuckHint(mk({ stuck: false }), allow) === null);
  check("B11 stuck omitted → null", validateStuckHint(JSON.stringify({ title: "x", body: "y", confidence: 0.9 }), allow) === null);
  check("B12 stuck:'true' (string) → null", validateStuckHint(mk({ stuck: "true" }), allow) === null);
  check("B13 confidence 0.4 (<0.5) → null", validateStuckHint(mk({ confidence: 0.4 }), allow) === null);
  check("B14 confidence missing → null", validateStuckHint(JSON.stringify({ stuck: true, title: "x", body: "y" }), allow) === null);
  check("B15 confidence non-number → null", validateStuckHint(mk({ confidence: "high" }), allow) === null);
  check("B16 confidence 1.5 → clamped to 1, kept", validateStuckHint(mk({ confidence: 1.5 }), allow)?.confidence === 1);
  check("B17 confidence exactly 0.5 → kept", !!validateStuckHint(mk({ confidence: 0.5 }), allow));

  // required fields
  check("B18 missing title → null", validateStuckHint(mk({ title: undefined }), allow) === null);
  check("B19 empty/whitespace body → null", validateStuckHint(mk({ body: "   " }), allow) === null);

  // length clamps
  check("B20 over-long title clamped to 64", (validateStuckHint(mk({ title: "T".repeat(120) }), allow)?.title.length ?? -1) === 64);
  check("B21 over-long body clamped to 240", (validateStuckHint(mk({ body: "B".repeat(400) }), allow)?.body.length ?? -1) === 240);

  // parsing robustness
  check("B22 ```json fenced block → parsed", !!validateStuckHint("```json\n" + mk({}) + "\n```", allow));
  check("B23 bare ``` fenced block → parsed", !!validateStuckHint("```\n" + mk({}) + "\n```", allow));
  check("B24 leading/trailing whitespace → parsed", !!validateStuckHint("\n\n  " + mk({}) + "  \n", allow));
  check("B25 non-JSON garbage → null", validateStuckHint("I think you should refresh the page!", allow) === null);
  check("B26 JSON array → null", validateStuckHint("[1,2,3]", allow) === null);
  check("B27 JSON null → null", validateStuckHint("null", allow) === null);
  check("B28 extra unknown fields → ignored, still valid", (() => {
    const r = validateStuckHint(mk({ evil: "<script>", role: "admin" }), allow);
    return !!r && r.title === base.title;
  })());
}

// ── C. resolveStuckQueue — decision matrix ───────────────────────────
section("C. resolveStuckQueue — AI vs canned vs none");
{
  const card = (key: string): HelpCard => ({ key, title: `T:${key}`, body: `B:${key}` });
  const ruleCard = card("stuck.rage-click");
  const gen: GeneratedHint = {
    intent: "applying",
    title: "Trying to apply?",
    body: "Open the board.",
    ctaLabel: "Open",
    ctaHref: "/internships",
    confidence: 0.6,
  };
  const score = { score: 0.8, topSignal: "rage-click" };
  const baseArgs = {
    hintsLive: true,
    emptyHint: null as HelpCard | null,
    score,
    aiConfigured: true,
    queueFloor: 0.6,
    escalate: 0.75,
    budgetOk: true,
    gen: null as GeneratedHint | null,
    ruleCard,
  };

  check("C1 hints muted → null", resolveStuckQueue({ ...baseArgs, hintsLive: false }) === null);

  const empty = resolveStuckQueue({ ...baseArgs, emptyHint: card("employer.profile.set-up") });
  check("C2 empty-state card wins, even at high score", empty?.triggeredBy === "rule:empty-state" && empty?.confidence === 0.8 && empty?.stuckKind === false);

  check("C3 below queue floor → null", resolveStuckQueue({ ...baseArgs, score: { score: 0.5, topSignal: "rage-click" } }) === null);

  const midScore = resolveStuckQueue({ ...baseArgs, score: { score: 0.65, topSignal: "rage-click" } });
  check("C4 score in [floor,escalate) → canned card, no AI", midScore?.triggeredBy === "rule:rage-click" && midScore?.confidence === 0.65 && midScore?.stuckKind === true);

  const aiWin = resolveStuckQueue({ ...baseArgs, gen });
  check("C5 eligible + budget + gen → AI hint", aiWin?.triggeredBy === "ai:stuck" && aiWin?.key === "ai.stuck.rage-click" && aiWin?.stuckKind === true);
  check("C6 AI hint confidence = max(gen, score)", aiWin?.confidence === 0.8);
  check("C7 AI hint carries the generated CTA", aiWin?.ctaHref === "/internships" && aiWin?.title === "Trying to apply?");

  const aiHighConf = resolveStuckQueue({ ...baseArgs, gen: { ...gen, confidence: 0.95 } });
  check("C8 AI confidence wins when higher than score", aiHighConf?.confidence === 0.95);

  const ranNothing = resolveStuckQueue({ ...baseArgs, budgetOk: true, gen: null });
  check("C9 eligible + budget + AI produced nothing → canned fallback", ranNothing?.triggeredBy === "rule:rage-click");

  const rateLimited = resolveStuckQueue({ ...baseArgs, budgetOk: false, gen: null });
  check("C10 eligible but budget spent → NOTHING (no canned double-fire)", rateLimited === null);

  const aiOff = resolveStuckQueue({ ...baseArgs, aiConfigured: false, gen: null });
  check("C11 AI not configured → canned fallback shows", aiOff?.triggeredBy === "rule:rage-click" && aiOff?.confidence === 0.8);

  const noCard = resolveStuckQueue({ ...baseArgs, aiConfigured: false, ruleCard: null });
  check("C12 no AI and no rule card → null", noCard === null);

  const aiWinNoCard = resolveStuckQueue({ ...baseArgs, gen, ruleCard: null });
  check("C13 AI wins even when no rule card exists", aiWinNoCard?.triggeredBy === "ai:stuck");

  // empty-state beats AI regardless
  const emptyOverAi = resolveStuckQueue({ ...baseArgs, emptyHint: card("admin.queue.review"), gen });
  check("C14 empty-state outranks AI", emptyOverAi?.triggeredBy === "rule:empty-state");
}

// ── D. dedupeStatusesFor — anti-nag ──────────────────────────────────
section("D. dedupeStatusesFor — anti-nag de-dupe window");
{
  const stuck = dedupeStatusesFor(true);
  check("D1 stuck hints block on dismissed + ignored too", stuck.includes("dismissed") && stuck.includes("ignored") && stuck.includes("pending") && stuck.includes("shown"));
  const pre = dedupeStatusesFor(false);
  check("D2 pre-stuck cards only block on active hints", pre.includes("pending") && pre.includes("shown") && !pre.includes("dismissed") && !pre.includes("ignored"));
}

// ── E. integration — menu feeds validation ───────────────────────────
section("E. integration — buildStuckMenu allow-list ⇒ validateStuckHint");
{
  const { allow } = buildStuckMenu({ surface: "/employer", role: "employer" as Role });
  const aRealHref = [...allow].find((h) => h.startsWith("/employer")) ?? "/dashboard";
  const good = JSON.stringify({ stuck: true, title: "Set up your profile?", body: "Add your company URL and we autofill the rest.", ctaLabel: "Edit profile", ctaHref: aRealHref, confidence: 0.8 });
  check("E1 model CTA matching the real menu is honoured", validateStuckHint(good, allow)?.ctaHref === aRealHref);
  const bad = JSON.stringify({ stuck: true, title: "x", body: "y", ctaLabel: "z", ctaHref: "/employer/secret-backdoor", confidence: 0.8 });
  check("E2 off-menu path (even same prefix) is dropped", validateStuckHint(bad, allow)?.ctaHref === null);
}

// ── summary ──────────────────────────────────────────────────────────
console.log(`\n\x1b[1m${fail === 0 ? "\x1b[32mALL PASSED" : "\x1b[31mFAILURES"}\x1b[0m  ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) {
  console.log("Failed: " + failures.join(", "));
  process.exit(1);
}
