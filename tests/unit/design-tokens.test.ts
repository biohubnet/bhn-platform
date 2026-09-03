import { test, expect } from "@playwright/test";
import {
  sanitizeOverrides, overridesToCss, ALL_TOKENS,
} from "../../src/lib/design-tokens/registry";

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
  const lg = ALL_TOKENS.find((t) => t.name === "radius-lg")!;
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

test("every token's fallback sits inside its own range", () => {
  for (const t of ALL_TOKENS) {
    expect(t.fallback, t.name).toBeGreaterThanOrEqual(t.min);
    expect(t.fallback, t.name).toBeLessThanOrEqual(t.max);
  }
});

test("the radius ladder's fallbacks increase step by step", () => {
  // A flat or out-of-order ladder is exactly the bug this work fixed:
  // rounded-md used to render smaller than rounded-sm.
  const radii = ALL_TOKENS.filter((t) => t.name.startsWith("radius-"));
  for (let i = 1; i < radii.length; i++) {
    expect(radii[i].fallback, `${radii[i].name} vs ${radii[i - 1].name}`)
      .toBeGreaterThan(radii[i - 1].fallback);
  }
});
