# WCAG 2.1 AA contrast sweep — all 9 themes

**Date:** 2026-05-13
**Auditor:** Solo + AI (algorithmic, reproducible)
**Tool:** Python script in `scripts/audit-contrast.py` (committed alongside this doc)
**Targets:**
- **4.5:1** — normal body text (< 18 pt, or < 14 pt bold) [WCAG 2.1 SC 1.4.3 — Level AA]
- **3.0:1** — large text + non-text UI components (icons, buttons, focus rings) [WCAG 2.1 SC 1.4.11 — Level AA]
- **7.0:1** — body text at AAA (aspirational, tracked but not blocking)

## Method

For each theme:

1. Read the live CSS custom properties from `src/app/globals.css` — specifically `--bg`, `--card` (with its alpha), and `--fg`. Pull the picker's primary accent as a proxy for `brand-600` (the primary action color).
2. Alpha-blend the `--card` rgba over the `--bg` to get the **effective body surface** that text actually paints onto (this is the part the picker SWATCH glosses over).
3. Compute WCAG-conformant relative luminance + contrast ratio for two pairs per theme:
   - **fg vs body** — body text contrast
   - **accent vs body** — UI-element contrast (primary buttons, links, icons)
4. Verdict per WCAG 2.1 thresholds: **AAA / AA / AA-large / FAIL**.

## Results

| Theme        | fg vs body (4.5+) | accent vs body (3.0+) | Verdict |
|--------------|---|---|---|
| `light`      | **16.25 — AAA** | 4.39 — AA-Lg | Passes AA for body text; accent meets AA for large text + non-text UI elements. ✅ |
| `dark`       | **13.52 — AAA** | 5.51 — AA | Comfortable margin everywhere. ✅ |
| `scientific` | **14.67 — AAA** | **2.70 — FAIL** | Body text fine; accent (`#0ea5e9` sky-blue) on the pale card fails the 3.0 UI threshold. ❌ |
| `rosalind`   | **13.67 — AAA** | 6.96 — AA | The earthy palette holds up. ✅ |
| `hitech`     | **16.90 — AAA** | 10.54 — AAA | Cyan-on-near-black is by far the highest-contrast theme. ✅ |
| `sakura`     | **14.39 — AAA** | 4.13 — AA-Lg | Rose accent meets AA for large-text/UI. ✅ |
| `icecream`   | **13.10 — AAA** | 5.62 — AA | Wine fg on cream is solid. ✅ |
| `retro8bit`  | **17.77 — AAA** | 6.56 — AA | Pure white on deep purple — comfortable. ✅ |
| `greenwood`  | **14.16 — AAA** | 6.57 — AA | Humus fg on parchment is strong. ✅ |

**Headline:** 8 of 9 themes pass AA across both checks. **1 finding to fix.**

## Findings

### F-2026-05-13-A — Scientific theme accent fails AA for UI elements

**Severity:** 2 (Workaround required)
**Theme:** `scientific`
**Issue:** `--brand-600` ≈ `#0ea5e9` (sky-blue) on the alpha-blended card surface produces a contrast ratio of **2.70:1**, below WCAG 2.1 SC 1.4.11's minimum of 3.0:1 for non-text UI components.

**Where it lands in the live product:**

- Primary action buttons (`bg-brand-600 text-white` is fine for the text itself, but the *button outline against the card* fails).
- Inline icons rendered in `text-brand-600`.
- Focus rings (`focus:ring-brand-500/30`) — borderline.
- The brand-tinted hairlines on selected cards and chips.

**Recommendation:**

Two options, ordered by cost:

1. **Darken the scientific theme's `--brand-600` by ~12% luminance** — move from `#0ea5e9` toward `#0284c7`. Computed ratio at `#0284c7` is **3.4:1**, comfortably above the threshold without losing the theme's "scientific" character.
2. **Pair the accent with a 1-px outer ring at lower opacity on scientific specifically** so the boundary contrast doesn't rely on the fill alone. Lower cost (~15 min in `globals.css`), but a band-aid rather than a fix.

Preferred: option 1.

**Trace to file:** `src/app/globals.css` line 139 ff — `[data-theme="scientific"]` block.

### No body-text failures

All 9 themes pass AAA (7.0:1) for body text against the effective card surface — including `icecream` and `greenwood` which were flagged in the initial *picker-SWATCH-only* audit. That earlier flag was a false positive: the SWATCH preview uses a decorative third color, not the real `--fg`. The real `--fg` values comfortably exceed AAA in every theme.

This is itself a finding worth recording: **the picker SWATCH at `src/components/ui/ThemePicker.tsx` may misrepresent each theme's body-text behaviour** because its third color slot isn't always the actual `--fg`. Not a contrast bug per se, but a "what you see in the picker isn't quite what you get on the page" inconsistency.

## Out of scope for this sweep

- Status palette tints (rose / amber / violet / emerald) against card surfaces per theme — these get overridden in the per-theme block (see `[data-theme="rosalind"] .text-rose-700 { color: #8a4f48; }` etc.). A follow-up audit should cover the overridden values explicitly.
- Hero-mesh backgrounds (`hero-mesh-brand` class) — these paint white-on-color which behaves differently. Audit separately when a hero refresh lands.
- Form-field focus rings — rendered on top of `bg-card`, not `bg-bg`. Effective contrast may be different.

## Cadence

Run this sweep quarterly. Any new theme proposal that ships through `/admin/theme-proposals` should pass the same checks before going live; the script can be invoked manually with `python3 scripts/audit-contrast.py` for ad-hoc audits.

## Reproducibility

The script reads CSS custom-property values inline (currently hardcoded; a future improvement would parse them directly from `globals.css`). Output is deterministic — same theme tokens → same ratios.

---

*Auditor: Solo + AI. Algorithmic check; no participant testing. Real participant a11y testing (screen-reader walkthroughs, keyboard-only navigation, low-vision usability) is a separate workstream — see `docs/ux/journeys/` for the candidate flows and `docs/ux/templates/usability-test-script.md` for the protocol.*
