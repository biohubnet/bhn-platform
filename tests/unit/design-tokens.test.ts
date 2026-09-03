import { test, expect } from "@playwright/test";
import {
  sanitizeOverrides, overridesToCss, CONTROLS, MANAGED, isValidColor,
  type SizeControl,
} from "../../src/lib/design-tokens/registry";
import { contrastRatio, parseColor } from "../../src/lib/design-tokens/contrast";

const SIZES = CONTROLS.filter((c): c is SizeControl => c.kind === "size");

/**
 * sanitizeOverrides is the boundary between an admin form and a <style>
 * block that is emitted into every page of the platform. Everything it
 * lets through ends up in the document, so it gets tested like the
 * security control it is rather than like a formatter.
 */

test("keeps a value that is inside the token's declared range", () => {
  expect(sanitizeOverrides({ "radius-lg": 12 })).toEqual({ "radius-lg": 12 });
});

test("drops token names it does not know", () => {
  expect(sanitizeOverrides({ "radius-lg": 12, "color-fg": 5, evil: 1 })).toEqual({ "radius-lg": 12 });
});

test("drops values outside the declared range in both directions", () => {
  const lg = SIZES.find((t) => t.name === "radius-lg")!;
  expect(sanitizeOverrides({ "radius-lg": lg.max + 1 })).toEqual({});
  expect(sanitizeOverrides({ "radius-lg": lg.min - 1 })).toEqual({});
});

test("drops non-finite numbers", () => {
  expect(sanitizeOverrides({ "radius-lg": Number.NaN })).toEqual({});
  expect(sanitizeOverrides({ "radius-lg": Number.POSITIVE_INFINITY })).toEqual({});
});

test("coerces numeric strings, since a form posts strings", () => {
  expect(sanitizeOverrides({ "radius-lg": "12" })).toEqual({ "radius-lg": 12 });
});

test("drops values that are not numbers at all", () => {
  expect(sanitizeOverrides({ "radius-lg": "14px" })).toEqual({});
  expect(sanitizeOverrides({ "radius-lg": { toString: () => "12" } })).toEqual({});
  expect(sanitizeOverrides({ "radius-lg": null })).toEqual({});
});

test("survives a non-object payload without throwing", () => {
  for (const bad of [null, undefined, 42, "x", true]) {
    expect(sanitizeOverrides(bad)).toEqual({});
  }
});

test("a CSS-injection attempt cannot reach the stylesheet", () => {
  // The attack shape: get a closing brace and a new rule into the value.
  // It fails at the number check, and even a value that survived would be
  // re-emitted from a number plus a unit from the registry, never as text.
  const attack = { "radius-lg": "12px} body{display:none} .x{a:" };
  expect(sanitizeOverrides(attack)).toEqual({});
  expect(overridesToCss(sanitizeOverrides(attack))).toBe("");
});

test("emits nothing when there is nothing to override", () => {
  expect(overridesToCss({})).toBe("");
});

test("emits a :root rule with the unit from the registry", () => {
  const css = overridesToCss(sanitizeOverrides({ "radius-lg": 12, spacing: 0.28 }));
  expect(css).toBe(":root{--radius-lg:12px;--spacing:0.28rem}");
});

test("emits declarations in ladder order, not insertion order", () => {
  // Reading the generated rule is part of debugging a theme, so the order
  // should match the scale rather than whatever the form happened to send.
  const css = overridesToCss(sanitizeOverrides({ "radius-xl": 20, "radius-xs": 2, "radius-lg": 14 }));
  expect(css).toBe(":root{--radius-xs:2px;--radius-lg:14px;--radius-xl:20px}");
});

test("every sized token's fallback sits inside its own range", () => {
  for (const t of SIZES) {
    expect(t.fallback, t.name).toBeGreaterThanOrEqual(t.min);
    expect(t.fallback, t.name).toBeLessThanOrEqual(t.max);
  }
});

test("the radius ladder's fallbacks increase step by step", () => {
  // A flat or out-of-order ladder is exactly the bug this work fixed:
  // rounded-md used to render smaller than rounded-sm.
  const radii = SIZES.filter((t) => t.name.startsWith("radius-"));
  for (let i = 1; i < radii.length; i++) {
    expect(radii[i].fallback, `${radii[i].name} vs ${radii[i - 1].name}`)
      .toBeGreaterThan(radii[i - 1].fallback);
  }
});


/* ── colour controls ─────────────────────────────────────────────────
   A colour lands verbatim in a <style> element, so the grammar it has
   to match is closed rather than "whatever a browser tolerates". */

test("accepts the colour notations the platform actually uses", () => {
  for (const ok of ["#fff", "#ffffff", "#1c1c20", "#1c1c2080",
                    "rgb(28,28,32)", "rgba(28, 28, 32, 0.08)", "rgba(28,28,32,.5)"]) {
    expect(isValidColor(ok), ok).toBe(true);
  }
});

test("rejects colour notations that would let arbitrary CSS through", () => {
  for (const bad of ["red", "var(--fg)", "url(x)", "#12345", "rgb(28,28,32); }",
                     "hsl(0 0% 0%)", "#fff}body{display:none", "expression(1)", ""]) {
    expect(isValidColor(bad), bad).toBe(false);
  }
});

test("a colour that fails the grammar never reaches the stylesheet", () => {
  const attack = { fg: "#fff}body{display:none}.x{a:" };
  expect(sanitizeOverrides(attack)).toEqual({});
  expect(overridesToCss(sanitizeOverrides(attack))).toBe("");
});

test("keeps a valid colour and emits it verbatim", () => {
  expect(overridesToCss(sanitizeOverrides({ fg: "#123456" }))).toBe(":root{--fg:#123456}");
});

/* ── option controls ───────────────────────────────────────────────── */

test("rejects an option value the registry does not declare", () => {
  expect(sanitizeOverrides({ "default-transition-timing-function": "wobble" })).toEqual({});
});

test("no control writes a token Tailwind cannot read at runtime", () => {
  // Tailwind v4 compiles shadow-* to a literal inside --tw-shadow, so a
  // --shadow-* override reaches nothing. A Depth group shipped once and
  // was inert; this stops it coming back by the same route.
  for (const c of CONTROLS) {
    expect(c.name.startsWith("shadow-"), `${c.name} cannot work at runtime`).toBe(false);
  }
});

test("easing writes itself, since its own name is the real token", () => {
  const css = overridesToCss(sanitizeOverrides({ "default-transition-timing-function": "linear" }));
  expect(css).toBe(":root{--default-transition-timing-function:linear}");
});

/* ── contrast ────────────────────────────────────────────────────────
   The readout is the guardrail on the colour dials, so it gets tested
   against known values rather than trusted. */

test("matches known WCAG ratios", () => {
  expect(contrastRatio("#000000", "#ffffff")!).toBeCloseTo(21, 1);
  expect(contrastRatio("#ffffff", "#ffffff")!).toBeCloseTo(1, 5);
  // 4.54:1 — the canonical "just passes AA" grey on white.
  expect(contrastRatio("#767676", "#ffffff")!).toBeGreaterThan(4.5);
  expect(contrastRatio("#777777", "#ffffff")!).toBeLessThan(4.6);
});

test("composites alpha instead of treating it as opaque", () => {
  // --line is rgba(28,28,32,0.08). Read as opaque it would report ~17:1;
  // composited onto the card it is barely over 1:1, which is the truth.
  const asOpaque = contrastRatio("#1c1c20", "#fafaf6")!;
  const withAlpha = contrastRatio("rgba(28,28,32,0.08)", "#fafaf6")!;
  expect(asOpaque).toBeGreaterThan(15);
  expect(withAlpha).toBeLessThan(1.3);
});

test("returns null rather than a confident wrong number", () => {
  expect(contrastRatio("nonsense", "#fff")).toBeNull();
  expect(parseColor("hsl(0 0% 0%)")).toBeNull();
});

test("every ink control's shipped default passes its own target", () => {
  // If a fallback in the registry cannot clear the bar the editor draws,
  // the panel is holding admins to a standard it does not meet itself.
  const cards = new Map(CONTROLS.map((c) => [c.name, c]));
  for (const c of CONTROLS) {
    if (c.kind !== "color" || !c.against || !c.ratio) continue;
    const againstControl = cards.get(c.against);
    const bg = againstControl && againstControl.kind === "color" ? againstControl.fallback : c.against;
    const r = contrastRatio(c.fallback, bg);
    expect(r, `${c.name} against ${c.against}`).not.toBeNull();
    expect(r!, `${c.name} against ${c.against}`).toBeGreaterThanOrEqual(c.ratio);
  }
});


test("MANAGED covers every control, so nothing is left un-tracked", () => {
  // The editor strips and restores by this list. A control missing from it
  // would be written on preview and never cleaned up.
  expect([...MANAGED].sort()).toEqual(CONTROLS.map((c) => c.name).sort());
});
