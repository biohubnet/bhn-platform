#!/usr/bin/env node
/**
 * audit-theme-coverage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans src/**\/*.tsx + src/**\/*.ts for "problem shade" Tailwind colour classes
 * and cross-checks them against dark-theme overrides in globals.css.
 *
 * Problem shades that fail on dark backgrounds:
 *   bg-{family}-{50|100|150|200}       — pastel tints → near-white on dark bg
 *   text-{family}-{600|700|800|900}    — dark text → invisible on dark bg
 *   ring-{family}-{50|100|200}         — pale rings on dark bg
 *   border-{family}-{50|100|200}       — pale borders on dark bg
 *
 * "Covered" means globals.css has an override for that (theme, family):
 *   tint-vars  → --color-{family}-50 appears inside the [data-theme="X"] block
 *   text-lifts → [data-theme="X"] .text-{family}-  appears anywhere in the file
 *
 * Run from project root:
 *   node scripts/audit-theme-coverage.js
 *
 * Exit code 0 = all good. Exit code 1 = gaps found.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT  = path.resolve(__dirname, '..');
const SRC_DIR       = path.join(PROJECT_ROOT, 'src');
const GLOBALS_CSS   = path.join(SRC_DIR, 'app', 'globals.css');

// All standard Tailwind colour families to audit.
const FAMILIES = [
  'rose', 'amber', 'emerald', 'sky', 'violet', 'blue', 'green',
  'red', 'cyan', 'indigo', 'purple', 'orange', 'teal', 'slate',
  'gray', 'zinc', 'neutral', 'stone', 'yellow', 'lime', 'pink', 'fuchsia',
];

// Tailwind shades that are "problematic" on a dark background.
const BG_LIGHT_SHADES   = new Set(['50', '100', '150', '200']);  // bg-* → washed-out pastel
const TEXT_DARK_SHADES  = new Set(['600', '700', '800', '900']); // text-* → illegible dark
const RING_LIGHT_SHADES = new Set(['50', '100', '200']);         // ring-* / border-* → near-invisible

// Directories / files to skip entirely.
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /globals\.css$/,
];

// ─── Step 1: Collect source files ────────────────────────────────────────────

/**
 * Recursively walk `dir`, yielding every .tsx / .ts file path that is not
 * matched by SKIP_PATTERNS.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function collectSourceFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip excluded patterns.
    if (SKIP_PATTERNS.some(rx => rx.test(fullPath))) continue;

    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Step 2: Scan source files for colour-class usages ───────────────────────

/**
 * Scan a single source file and return an array of usage records:
 * { file, line, type, family, shade, raw }
 *
 * `type` ∈ { 'bg', 'text', 'ring', 'border' }
 *
 * @param {string} filePath
 * @returns {Array<{file:string, line:number, type:string, family:string, shade:string, raw:string}>}
 */
function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const usages = [];
  const lines  = content.split('\n');

  // Regex: captures (type)(family)(shade) out of any Tailwind class token.
  // We allow optional modifier prefixes like "hover:" / "dark:" / "md:" etc.
  // and optional opacity suffix like "/60" or "/[0.5]".
  const twRe = /(?:^|[\s"'`{(,])(?:[\w-]+:)*(bg|text|ring|border)-([\w]+)-(\d+)/g;

  lines.forEach((rawLine, idx) => {
    let match;
    // Reset lastIndex each time we reuse the regex on a new string.
    twRe.lastIndex = 0;
    while ((match = twRe.exec(rawLine)) !== null) {
      const [, type, family, shade] = match;

      // Only flag families we care about.
      if (!FAMILIES.includes(family)) continue;

      // Only flag the "problematic" shades per type.
      const isProblematic =
        (type === 'bg'     && BG_LIGHT_SHADES.has(shade))  ||
        (type === 'text'   && TEXT_DARK_SHADES.has(shade))  ||
        (type === 'ring'   && RING_LIGHT_SHADES.has(shade)) ||
        (type === 'border' && RING_LIGHT_SHADES.has(shade));

      if (!isProblematic) continue;

      usages.push({
        file:   filePath,
        line:   idx + 1,   // 1-based
        type,
        family,
        shade,
        raw:    `${type}-${family}-${shade}`,
      });
    }
  });

  return usages;
}

// ─── Step 3: Parse globals.css ───────────────────────────────────────────────

/**
 * Return the raw text of globals.css, or throw with a clear message.
 */
function readGlobalsCss() {
  if (!fs.existsSync(GLOBALS_CSS)) {
    throw new Error(`globals.css not found at ${GLOBALS_CSS}`);
  }
  return fs.readFileSync(GLOBALS_CSS, 'utf8');
}

/**
 * Detect dark themes from globals.css.
 *
 * Strategy: find every [data-theme="X"] block and check whether it contains
 * a --bg value that starts with a very dark hex (#0 or #1) — the same
 * pattern we use in the theme variables (--bg: #02060d, --bg: #0c0604 …).
 *
 * Returns Map<themeId, label> where label is a human-readable name.
 *
 * @param {string} css
 * @returns {Map<string, string>}
 */
function detectDarkThemes(css) {
  const darkThemes = new Map();

  // Find all [data-theme="X"] blocks.
  // We scan for the opening selector, then walk forward to find the
  // matching closing brace.  This is intentionally simple — it only
  // needs to work for the structured globals.css we control.
  const selectorRe = /\[data-theme="([^"]+)"\]\s*\{/g;

  let m;
  while ((m = selectorRe.exec(css)) !== null) {
    const themeId  = m[1];
    const blockStart = m.index + m[0].length;

    // Walk forward to find the matching '}'.
    let depth = 1;
    let pos   = blockStart;
    while (pos < css.length && depth > 0) {
      if (css[pos] === '{') depth++;
      else if (css[pos] === '}') depth--;
      pos++;
    }
    const blockText = css.slice(blockStart, pos - 1);

    // Check if this block contains a dark --bg value.
    // Pattern: --bg: followed by optional spaces then a very dark hex (#0, #1).
    // We also accept rgba(0, …) / rgba(1, …) style values.
    const bgMatch = blockText.match(/--bg\s*:\s*([^;]+)/);
    if (!bgMatch) continue;

    const bgValue = bgMatch[1].trim().toLowerCase();

    // Heuristic: the bg is "dark" if:
    //   - it starts with #0 or #1  (hex values below ~rgb(32,32,32))
    //   - it's rgba with a very low RGB value (rgba(0, …) etc.)
    const isDark =
      /^#0/.test(bgValue) ||
      /^#1[0-9a-f]/.test(bgValue) ||
      /^rgba?\(\s*[0-9]\s*,/.test(bgValue);

    // Special caveat: Greenwood night-mode switches --bg inside a
    // compound selector [data-theme="greenwood"][data-greenwood-time="night"].
    // The outer [data-theme="greenwood"] block itself has a light bg, so
    // Greenwood is NOT flagged as a dark theme here. The script adds a note
    // about it in the caveat section at the end.
    if (isDark) {
      darkThemes.set(themeId, themeId);
    }
  }

  return darkThemes;
}

/**
 * For each dark theme, parse which colour families are "tint-covered" and
 * "text-covered".
 *
 * tint-covered  → --color-{family}-50 appears inside the [data-theme="X"] block
 * text-covered  → [data-theme="X"] .text-{family}-  appears in the CSS string
 *
 * Returns Map<themeId, { tintCovered: Set<family>, textCovered: Set<family> }>
 *
 * @param {string} css
 * @param {Map<string, string>} darkThemes
 * @returns {Map<string, {tintCovered: Set<string>, textCovered: Set<string>}>}
 */
function parseCssCoverage(css, darkThemes) {
  const coverage = new Map();

  for (const themeId of darkThemes.keys()) {
    const tintCovered = new Set();
    const textCovered = new Set();

    // ── Tint-var coverage ──────────────────────────────────────────────
    // Look for all [data-theme="X"] blocks (there may be more than one
    // for the same theme — e.g. the separate block for colour overrides).
    const themeRe = new RegExp(
      `\\[data-theme="${escapeRegex(themeId)}"\\]\\s*(?:[^{]*)?\\{`,
      'g'
    );

    let tm;
    while ((tm = themeRe.exec(css)) !== null) {
      const blockStart = tm.index + tm[0].length;

      // Walk to matching '}'.
      let depth = 1;
      let pos   = blockStart;
      while (pos < css.length && depth > 0) {
        if (css[pos] === '{') depth++;
        else if (css[pos] === '}') depth--;
        pos++;
      }
      const blockText = css.slice(blockStart, pos - 1);

      // Collect every --color-{family}-50 definition inside this block.
      const varRe = /--color-([\w-]+)-50\s*:/g;
      let vm;
      while ((vm = varRe.exec(blockText)) !== null) {
        tintCovered.add(vm[1]);
      }
    }

    // ── Text-lift coverage ─────────────────────────────────────────────
    // Look for [data-theme="X"] .text-{family}-{shade} selectors anywhere.
    // The regex doesn't restrict the shade — presence of any dark-shade
    // override is enough to count as covered.
    const textLiftRe = new RegExp(
      `\\[data-theme="${escapeRegex(themeId)}"\\]\\s+\\.text-(${FAMILIES.join('|')})-(\\d+)`,
      'g'
    );

    let lm;
    while ((lm = textLiftRe.exec(css)) !== null) {
      textCovered.add(lm[1]);
    }

    coverage.set(themeId, { tintCovered, textCovered });
  }

  return coverage;
}

/**
 * Escape a string for use inside a RegExp pattern.
 * @param {string} s
 * @returns {string}
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Step 4: Cross-reference and build gap report ────────────────────────────

/**
 * Aggregate all source-file usages by (family, type).
 *
 * Returns Map<family, { bgCount:number, bgFiles:Set<string>,
 *                        textCount:number, textFiles:Set<string>,
 *                        otherCount:number, otherFiles:Set<string>,
 *                        examples:Array<{file,line,raw}> }>
 *
 * "bg"    = bg-* usages
 * "text"  = text-* usages
 * "other" = ring-* / border-* usages
 *
 * @param {Array} usages
 * @returns {Map}
 */
function aggregateUsages(usages) {
  const map = new Map();

  for (const u of usages) {
    if (!map.has(u.family)) {
      map.set(u.family, {
        bgCount:    0, bgFiles:    new Set(),
        textCount:  0, textFiles:  new Set(),
        otherCount: 0, otherFiles: new Set(),
        examples:   [],
      });
    }
    const entry = map.get(u.family);

    if (u.type === 'bg') {
      entry.bgCount++;
      entry.bgFiles.add(u.file);
    } else if (u.type === 'text') {
      entry.textCount++;
      entry.textFiles.add(u.file);
    } else {
      entry.otherCount++;
      entry.otherFiles.add(u.file);
    }

    // Keep the first 3 examples per family for the report.
    if (entry.examples.length < 3) {
      entry.examples.push({ file: u.file, line: u.line, raw: u.raw });
    }
  }

  return map;
}

/**
 * For a given theme and the aggregated usage map, determine which families
 * have coverage gaps.
 *
 * A gap exists when:
 *   - The family has bg-* usages AND is NOT tint-covered for this theme.
 *   - The family has text-* usages AND is NOT text-covered for this theme.
 *   (ring/border usages use the same tint-var check as bg usages.)
 *
 * @param {string} themeId
 * @param {{tintCovered: Set<string>, textCovered: Set<string>}} themeCoverage
 * @param {Map} usageMap  — output of aggregateUsages()
 * @returns {Array<{family, missingTint:boolean, missingText:boolean, data}>}
 */
function findGaps(themeId, themeCoverage, usageMap) {
  const gaps = [];
  const { tintCovered, textCovered } = themeCoverage;

  for (const [family, data] of usageMap) {
    const needsTint = (data.bgCount + data.otherCount) > 0;
    const needsText = data.textCount > 0;

    const missingTint = needsTint && !tintCovered.has(family);
    const missingText = needsText && !textCovered.has(family);

    if (missingTint || missingText) {
      gaps.push({ family, missingTint, missingText, data });
    }
  }

  // Sort by total usage count descending so the most-impactful gaps come first.
  gaps.sort((a, b) => {
    const countA = a.data.bgCount + a.data.textCount + a.data.otherCount;
    const countB = b.data.bgCount + b.data.textCount + b.data.otherCount;
    return countB - countA;
  });

  return gaps;
}

// ─── Step 5: Render the report ───────────────────────────────────────────────

/** ANSI escape helpers. Gracefully degraded when stdout is not a TTY. */
const isTTY = process.stdout.isTTY;
const c = {
  reset:  isTTY ? '\x1b[0m'  : '',
  bold:   isTTY ? '\x1b[1m'  : '',
  red:    isTTY ? '\x1b[31m' : '',
  green:  isTTY ? '\x1b[32m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  cyan:   isTTY ? '\x1b[36m' : '',
  dim:    isTTY ? '\x1b[2m'  : '',
};

/**
 * Shorten an absolute file path to be relative to the project root,
 * for cleaner output.
 *
 * @param {string} absPath
 * @returns {string}
 */
function relPath(absPath) {
  return path.relative(PROJECT_ROOT, absPath);
}

/**
 * Pretty-print the full audit report.
 *
 * @param {Map<string,string>} darkThemes
 * @param {Map<string,{tintCovered,textCovered}>} coverage
 * @param {Map} usageMap
 * @param {number} totalFiles
 */
function printReport(darkThemes, coverage, usageMap, totalFiles) {
  const separator = '─'.repeat(64);

  console.log();
  console.log(`${c.bold}=== BHN Theme Coverage Audit ===${c.reset}`);
  console.log(`Scanning ${totalFiles.toLocaleString()} source files...`);

  if (darkThemes.size === 0) {
    console.log(
      `${c.yellow}⚠  No dark themes detected in globals.css. Nothing to audit.${c.reset}`
    );
    console.log();
    return 0; // no gaps possible
  }

  const darkThemeList = [...darkThemes.keys()].join(', ');
  console.log(`Dark themes detected: ${c.cyan}${darkThemeList}${c.reset}`);
  console.log();

  let totalGaps = 0;

  // ── Per-theme report ────────────────────────────────────────────────────
  for (const [themeId] of darkThemes) {
    const themeCoverage = coverage.get(themeId);
    const { tintCovered, textCovered } = themeCoverage;
    const gaps = findGaps(themeId, themeCoverage, usageMap);

    // Section header
    console.log(`${separator}`);
    console.log(
      `${c.bold}── ${themeId.toUpperCase()} (${themeId}) ` +
      `${'─'.repeat(Math.max(0, 54 - themeId.length * 2))}${c.reset}`
    );
    console.log();

    // ── OK families ─────────────────────────────────────────────────────
    const coveredFamilies = FAMILIES.filter(fam => {
      const d = usageMap.get(fam);
      if (!d) return false; // not used at all — skip from OK list too
      const needsTint = (d.bgCount + d.otherCount) > 0;
      const needsText = d.textCount > 0;
      // Both needed checks pass
      const tintOk = !needsTint || tintCovered.has(fam);
      const textOk = !needsText || textCovered.has(fam);
      return tintOk && textOk && (needsTint || needsText);
    });

    for (const fam of coveredFamilies) {
      const d        = usageMap.get(fam);
      const tintOk   = !((d.bgCount + d.otherCount) > 0) || tintCovered.has(fam);
      const textOk   = !(d.textCount > 0)                || textCovered.has(fam);
      const tintStr  = tintOk ? 'tint-vars covered' : `${c.red}tint-vars MISSING${c.reset}`;
      const textStr  = textOk ? 'text-lifts covered': `${c.red}text-lifts MISSING${c.reset}`;
      const hasTint  = (d.bgCount + d.otherCount) > 0;
      const hasText  = d.textCount > 0;
      // Only show relevant checks
      const detail   = [
        hasTint ? tintStr  : null,
        hasText ? textStr  : null,
      ].filter(Boolean).join(' | ');
      console.log(`  ${c.green}✅${c.reset} ${fam.padEnd(10)} ${detail}`);
    }

    // ── Families not used at all (no problematic shades in source) ───────
    const unusedFamilies = FAMILIES.filter(fam => !usageMap.has(fam));
    if (unusedFamilies.length > 0 && coveredFamilies.length > 0) {
      console.log(
        `  ${c.dim}(${unusedFamilies.join(', ')} — no problematic shades found in source)${c.reset}`
      );
    }

    console.log();

    // ── Gap families ────────────────────────────────────────────────────
    if (gaps.length === 0) {
      console.log(`  ${c.green}✅ All used families are covered for ${themeId}.${c.reset}`);
    } else {
      for (const { family, missingTint, missingText, data } of gaps) {
        const parts = [];
        if (missingTint) parts.push('tint-vars MISSING');
        if (missingText) parts.push('text-lifts MISSING');

        const bgUses   = data.bgCount;
        const txtUses  = data.textCount;
        const otherUses= data.otherCount;
        const totalUses= bgUses + txtUses + otherUses;
        const fileCount= new Set([...data.bgFiles, ...data.textFiles, ...data.otherFiles]).size;

        console.log(
          `  ${c.red}❌ MISSING: ${family}${c.reset} — ` +
          `${parts.join(', ')} | ` +
          `${totalUses} uses in ${fileCount} file${fileCount !== 1 ? 's' : ''} ` +
          `${c.dim}(bg:${bgUses} text:${txtUses} ring/border:${otherUses})${c.reset}`
        );

        for (const ex of data.examples) {
          console.log(
            `     ${c.dim}${relPath(ex.file)}:${ex.line}${c.reset} — ${c.yellow}${ex.raw}${c.reset}`
          );
        }
        console.log();
      }
    }

    totalGaps += gaps.length;
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(separator);
  if (totalGaps === 0) {
    console.log(
      `\n${c.green}${c.bold}Total: 0 gaps / ${darkThemes.size} dark theme${darkThemes.size !== 1 ? 's' : ''} ✅${c.reset}\n`
    );
  } else {
    console.log(
      `\n${c.red}${c.bold}Total: ${totalGaps} gap${totalGaps !== 1 ? 's' : ''} found ❌` +
      ` — run 'node scripts/audit-theme-coverage.js' for details${c.reset}\n`
    );
  }

  // ── Caveats ─────────────────────────────────────────────────────────────
  console.log(
    `${c.dim}Caveat: Greenwood night-mode ([data-greenwood-time="night"]) switches to a` +
    ` dark background at runtime but is NOT listed here — the base Greenwood theme is light.` +
    ` If you add bg-* / text-* overrides for Greenwood night, check them separately.${c.reset}`
  );
  console.log();

  return totalGaps;
}

// ─── Main ────────────────────────────────────────────────────────────────────

(function main() {
  // 1. Collect source files
  const sourceFiles = collectSourceFiles(SRC_DIR);

  // 2. Scan each file for problematic colour usages
  /** @type {Array} */
  const allUsages = [];
  for (const f of sourceFiles) {
    allUsages.push(...scanFile(f));
  }

  // 3. Aggregate usages by family
  const usageMap = aggregateUsages(allUsages);

  // 4. Parse globals.css
  let css;
  try {
    css = readGlobalsCss();
  } catch (e) {
    console.error(`${c.red}Error reading globals.css: ${e.message}${c.reset}`);
    process.exit(2);
  }

  // 5. Detect dark themes
  const darkThemes = detectDarkThemes(css);

  // 6. Parse per-theme coverage
  const coverage = parseCssCoverage(css, darkThemes);

  // 7. Print and get exit code
  const gaps = printReport(darkThemes, coverage, usageMap, sourceFiles.length);

  process.exit(gaps > 0 ? 1 : 0);
})();
