/**
 * The editable design system.
 *
 * Every control here maps to a CSS custom property that something on the
 * platform actually reads. Overrides are persisted in PlatformSetting and
 * injected as a `:root` block after globals.css in the root layout, where
 * they win on cascade — so a save reaches every user on their next page
 * load without a rebuild or a developer.
 *
 * WHAT IS DELIBERATELY ABSENT
 * globals.css also declares --surface-shadow, --surface-border,
 * --heading-weight, --heading-tracking, --heading-transform and
 * --body-features across eleven themes, and nothing in src reads any of
 * them. They are not exposed: a dial that changes nothing is worse than
 * no dial, because the first thing it teaches you is that the panel
 * lies. They want deleting or wiring up — see docs.
 *
 * Tailwind's bare `rounded` is also unreachable. In v4 it compiles to a
 * hardcoded 0.25rem wired to no variable, so the 378 usages sitting on
 * it cannot be tuned from here and need a codemod to join the ladder.
 *
 * ON COLOUR
 * Colour is the group where an untrained edit quietly drops text below
 * AA. Every ink control declares what it is normally read against, and
 * the editor shows the live contrast ratio as you drag. That is the
 * guardrail that makes it safe to hand over.
 */

export type ControlGroup = "corners" | "spacing" | "type" | "ink" | "brand" | "depth" | "motion";

export const GROUPS: readonly { id: ControlGroup; label: string; blurb: string }[] = [
  { id: "corners", label: "Corners",  blurb: "One ladder, smallest to softest. Cards and panels sit on Large; section boxes and dialogs on Extra large." },
  { id: "spacing", label: "Spacing",  blurb: "The multiplier behind every padding, margin and gap on the platform." },
  { id: "type",    label: "Type",     blurb: "Text sizes, line height and the weights headings use." },
  { id: "ink",     label: "Ink & surfaces", blurb: "Text and background colours. Contrast against the surface each one is read on is shown live." },
  { id: "brand",   label: "Brand",    blurb: "The brand ramp, light to dark. 600 is the button fill; 700 is the hover and link colour." },
  { id: "depth",   label: "Depth",    blurb: "How far surfaces lift off the page." },
  { id: "motion",  label: "Motion",   blurb: "Speed and easing for every transition." },
] as const;

interface Base {
  readonly name: string;
  readonly label: string;
  readonly group: ControlGroup;
  readonly hint: string;
}

export interface SizeControl extends Base {
  readonly kind: "size";
  readonly fallback: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** "" renders a unitless value — line height and font weight. */
  readonly unit: "px" | "rem" | "ms" | "";
}

export interface ColorControl extends Base {
  readonly kind: "color";
  readonly fallback: string;
  /** Token this colour is normally read against, for the contrast readout. */
  readonly against?: string;
  /** Target ratio. Body text 4.5, large text and non-text boundaries 3. */
  readonly ratio?: number;
}

export interface OptionControl extends Base {
  readonly kind: "option";
  readonly fallback: string;
  /** One choice may write several properties — a depth preset moves the
   *  whole shadow ladder together, which is the only way it stays a
   *  ladder rather than four unrelated dials. */
  readonly options: readonly { value: string; label: string; writes: Record<string, string> }[];
}

export type Control = SizeControl | ColorControl | OptionControl;

const px = (name: string, label: string, group: ControlGroup, fallback: number,
            min: number, max: number, hint: string, step = 1): SizeControl =>
  ({ kind: "size", name, label, group, fallback, min, max, step, unit: "px", hint });

const rem = (name: string, label: string, group: ControlGroup, fallback: number,
             min: number, max: number, hint: string, step = 0.005): SizeControl =>
  ({ kind: "size", name, label, group, fallback, min, max, step, unit: "rem", hint });

const num = (name: string, label: string, group: ControlGroup, fallback: number,
             min: number, max: number, hint: string, step = 0.01): SizeControl =>
  ({ kind: "size", name, label, group, fallback, min, max, step, unit: "", hint });

const ink = (name: string, label: string, fallback: string, hint: string,
             against?: string, ratio?: number): ColorControl =>
  ({ kind: "color", name, label, group: "ink", fallback, hint, against, ratio });

const brand = (step: number, fallback: string, hint: string, against?: string, ratio?: number): ColorControl =>
  ({ kind: "color", name: `brand-${step}`, label: `Brand ${step}`, group: "brand", fallback, hint, against, ratio });

export const CONTROLS: readonly Control[] = [
  // ── corners ────────────────────────────────────────────────────────
  px("radius-xs",  "Extra small", "corners", 3,  0, 24, "Tags and the smallest chips."),
  px("radius-sm",  "Small",       "corners", 6,  0, 32, "Nav links and inline badges."),
  px("radius-md",  "Medium",      "corners", 10, 0, 40, "Buttons, inputs and status pills."),
  px("radius-lg",  "Large",       "corners", 14, 0, 48, "Cards and panels. The most used step on the platform."),
  px("radius-xl",  "Extra large", "corners", 18, 0, 56, "Section boxes and dialogs."),
  px("radius-2xl", "2XL",         "corners", 24, 0, 64, "Hero surfaces and large media."),
  px("radius-3xl", "3XL",         "corners", 30, 0, 72, "The softest corners on the platform."),

  // ── spacing ────────────────────────────────────────────────────────
  rem("spacing", "Spacing base", "spacing", 0.25, 0.18, 0.34,
      "Every padding, margin and gap is a multiple of this. p-4 is four times it, so small moves go a long way.", 0.005),

  // ── type ───────────────────────────────────────────────────────────
  rem("text-xs",   "Extra small", "type", 0.75,  0.6,  1.0,  "Timestamps and the smallest labels."),
  rem("text-sm",   "Small",       "type", 0.875, 0.7,  1.1,  "Secondary lines and dense tables."),
  rem("text-base", "Body",        "type", 1.0,   0.85, 1.3,  "Default body text everywhere."),
  rem("text-lg",   "Large",       "type", 1.125, 0.95, 1.5,  "Lead paragraphs and card titles."),
  rem("text-xl",   "Extra large", "type", 1.25,  1.05, 1.8,  "Section headings."),
  rem("text-2xl",  "2XL",         "type", 1.5,   1.2,  2.4,  "Page titles."),
  rem("text-3xl",  "3XL",         "type", 1.875, 1.4,  3.2,  "Hero headlines."),
  num("leading-snug",    "Line height · snug",    "type", 1.375, 1.05, 1.7, "Headings and titles."),
  num("leading-normal",  "Line height · normal",  "type", 1.5,   1.2,  1.9, "Body text."),
  num("leading-relaxed", "Line height · relaxed", "type", 1.625, 1.3,  2.1, "Long-form reading."),
  num("font-weight-semibold", "Weight · semibold", "type", 600, 400, 800, "Titles and emphasis.", 50),
  num("font-weight-bold",     "Weight · bold",     "type", 700, 500, 900, "Headings and strong emphasis.", 50),

  // ── ink & surfaces ─────────────────────────────────────────────────
  ink("fg",          "Text",              "#1c1c20", "Body text, titles, anything you read.", "card-solid", 4.5),
  ink("fg-muted",    "Text · muted",      "#565660", "Supporting lines beside the main text.", "card-solid", 4.5),
  ink("fg-subtle",   "Text · subtle",     "#5b5b65", "Labels and captions. Already the weakest link on several themes.", "card-solid", 4.5),
  ink("bg",          "Page background",   "#ecedea", "Behind everything."),
  ink("card-solid",  "Card",              "#fafaf6", "The opaque card surface most content sits on."),
  ink("elevated",    "Elevated",          "#e3e3df", "Hover states and raised strips."),
  ink("raised",      "Raised",            "#d6d6d2", "The step above elevated."),
  // No pass/fail target on the hairlines: they are decorative dividers,
  // not UI-component boundaries, so WCAG 1.4.11 does not apply and the
  // shipped values sit around 1.2:1. The ratio is still shown, because
  // driving a divider toward the card until it vanishes is a real way to
  // break the page — it just is not a failure against a standard.
  ink("line",        "Hairline",          "rgba(28,28,32,0.08)", "Dividers and card edges.", "card-solid"),
  ink("line-strong", "Hairline · strong", "rgba(28,28,32,0.16)", "Emphasised borders and separators.", "card-solid"),

  // ── brand ──────────────────────────────────────────────────────────
  brand(50,  "#e3edf0", "Tint behind brand chips."),
  brand(100, "#cadbe1", "Hover on brand tints."),
  brand(200, "#a3bdc6", "Rings and borders on brand elements."),
  brand(300, "#7398a4", "Decorative fills."),
  brand(400, "#517986", "Decorative fills."),
  brand(500, "#3b6471", "Gradient midpoint."),
  brand(600, "#2c4f5a", "Primary button fill. White text sits on this.", "#ffffff", 4.5),
  brand(700, "#213c46", "Button hover and link colour.", "card-solid", 4.5),
  brand(800, "#182d35", "Deep accents."),
  brand(900, "#101e24", "The darkest brand step."),

  // ── depth ──────────────────────────────────────────────────────────
  {
    kind: "option", name: "preset-depth", label: "Shadow strength", group: "depth",
    hint: "Moves the whole shadow ladder together. Editing four shadows separately is how a ladder stops being one.",
    fallback: "standard",
    options: [
      { value: "flat", label: "Flat — no shadows", writes: {
        "shadow-sm": "0 0 #0000", "shadow-md": "0 0 #0000", "shadow-lg": "0 0 #0000", "shadow-xl": "0 0 #0000" } },
      { value: "subtle", label: "Subtle", writes: {
        "shadow-sm": "0 1px 2px 0 rgb(0 0 0 / 0.03)",
        "shadow-md": "0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "shadow-lg": "0 6px 12px -6px rgb(0 0 0 / 0.07)",
        "shadow-xl": "0 12px 24px -12px rgb(0 0 0 / 0.09)" } },
      { value: "standard", label: "Standard", writes: {
        "shadow-sm": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "shadow-md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "shadow-lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "shadow-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" } },
      { value: "deep", label: "Deep", writes: {
        "shadow-sm": "0 2px 5px 0 rgb(0 0 0 / 0.16)",
        "shadow-md": "0 6px 12px -2px rgb(0 0 0 / 0.18)",
        "shadow-lg": "0 16px 28px -6px rgb(0 0 0 / 0.22)",
        "shadow-xl": "0 28px 44px -10px rgb(0 0 0 / 0.26)" } },
    ],
  },

  // ── motion ─────────────────────────────────────────────────────────
  { kind: "size", name: "default-transition-duration", label: "Transition speed", group: "motion",
    fallback: 150, min: 0, max: 500, step: 10, unit: "ms",
    hint: "Every transition utility on the platform. Zero turns motion off." },
  {
    kind: "option", name: "default-transition-timing-function", label: "Easing", group: "motion",
    hint: "The curve those transitions follow.", fallback: "cubic-bezier(0.4, 0, 0.2, 1)",
    options: [
      { value: "cubic-bezier(0.4, 0, 0.2, 1)",    label: "Standard",  writes: {} },
      { value: "cubic-bezier(0.22, 1, 0.36, 1)",  label: "Decelerate — soft landing", writes: {} },
      { value: "cubic-bezier(0.4, 0, 1, 1)",      label: "Accelerate — quick exit",   writes: {} },
      { value: "linear",                          label: "Linear",    writes: {} },
    ],
  },
] as const;

const BY_NAME = new Map(CONTROLS.map((c) => [c.name, c]));

export type TokenOverrides = Record<string, string | number>;

/** Hex (#rgb/#rrggbb/#rrggbbaa), or rgb()/rgba() with numeric arguments.
 *  Nothing else reaches the stylesheet: this value is written into a
 *  `<style>` element served on every page, so the grammar is closed
 *  rather than "whatever the browser tolerates". */
const COLOR = /^(#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d{1,3})\s*)?\))$/i;

export function isValidColor(v: string): boolean {
  return COLOR.test(v.trim());
}

/**
 * The boundary between an admin form and the stylesheet.
 *
 * Anything this returns is emitted into every page, so it validates by
 * control kind rather than trusting the caller: sizes must be finite and
 * inside their declared range, colours must match a closed grammar, and
 * an option must be one of the values the registry declares.
 */
export function sanitizeOverrides(input: unknown): TokenOverrides {
  if (input === null || typeof input !== "object") return {};
  const out: TokenOverrides = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const c = BY_NAME.get(key);
    if (!c) continue;

    if (c.kind === "size") {
      // Numbers and numeric strings only. A bare Number() also accepts
      // booleans, empty strings and any object with a toString, none of
      // which a form should produce and all of which would land a value
      // in the stylesheet that nobody chose.
      const n =
        typeof raw === "number" ? raw
        : typeof raw === "string" && raw.trim() !== "" ? Number(raw)
        : Number.NaN;
      if (!Number.isFinite(n) || n < c.min || n > c.max) continue;
      out[key] = Math.round(n * 1000) / 1000;
    } else if (c.kind === "color") {
      if (typeof raw !== "string" || !isValidColor(raw)) continue;
      out[key] = raw.trim();
    } else {
      if (typeof raw !== "string") continue;
      if (!c.options.some((o) => o.value === raw)) continue;
      out[key] = raw;
    }
  }
  return out;
}

/**
 * Serialises overrides into a `:root` rule.
 *
 * Declarations come out in registry order rather than insertion order, so
 * reading the generated rule while debugging a theme follows the same
 * shape as the editor. Returns "" when there is nothing to write, so the
 * layout can skip the element entirely.
 */
export function overridesToCss(overrides: TokenOverrides): string {
  const decls: string[] = [];
  for (const c of CONTROLS) {
    const v = overrides[c.name];
    if (v === undefined) continue;
    if (c.kind === "size") {
      decls.push(`--${c.name}:${v}${c.unit}`);
    } else if (c.kind === "color") {
      decls.push(`--${c.name}:${v}`);
    } else {
      const chosen = c.options.find((o) => o.value === v);
      if (!chosen) continue;
      // A preset writes the properties it owns; a control whose own name
      // is a real token (easing) also writes itself.
      for (const [k, val] of Object.entries(chosen.writes)) decls.push(`--${k}:${val}`);
      if (Object.keys(chosen.writes).length === 0) decls.push(`--${c.name}:${v}`);
    }
  }
  return decls.length === 0 ? "" : `:root{${decls.join(";")}}`;
}

export function controlsFor(group: ControlGroup): readonly Control[] {
  return CONTROLS.filter((c) => c.group === group);
}
