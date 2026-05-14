#!/usr/bin/env python3
"""
WCAG 2.1 AA contrast sweep across every theme.

Run:    python3 scripts/audit-contrast.py
Audit:  docs/ux/audits/<date>-wcag-aa-contrast-sweep.md

Reads the live CSS custom properties for each theme (--bg, --card
with its rgba alpha, --fg) and a representative accent. Alpha-blends
card over bg to get the effective body surface — that's the
background text actually paints onto — then computes WCAG-conformant
contrast ratios for:

  • fg vs body surface    (target 4.5 for normal body text)
  • accent vs body        (target 3.0 for non-text UI components)

Verdict tags: AAA (>= 7.0), AA (>= 4.5), AA-Lg (>= 3.0), FAIL.

Theme values are hardcoded below — when a theme is added or its
tokens change, update the THEMES table. A future improvement would
parse the values directly out of src/app/globals.css.
"""


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def composite(top: tuple[int, int, int, float], base: tuple[int, int, int]) -> tuple[int, int, int]:
    r1, g1, b1, a = top
    r2, g2, b2 = base
    return (
        round(r1 * a + r2 * (1 - a)),
        round(g1 * a + g2 * (1 - a)),
        round(b1 * a + b2 * (1 - a)),
    )


def luminance(rgb: tuple[int, int, int]) -> float:
    def chan(c: float) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    l1, l2 = luminance(c1), luminance(c2)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def verdict(ratio: float) -> str:
    if ratio >= 7:
        return "AAA"
    if ratio >= 4.5:
        return "AA"
    if ratio >= 3:
        return "AA-Lg"
    return "FAIL"


# (bg, card-rgba, fg, accent). Update when a theme is added or its
# tokens move. Source of truth: src/app/globals.css.
THEMES: dict[str, tuple[str, tuple[int, int, int, float], str, str]] = {
    "biohubnet":  ("#F4F8F8", (255, 255, 255, 0.92), "#0F2A30", "#137495"),
    "light":      ("#ecedea", (252, 252, 250, 0.88), "#1c1c20", "#137495"),
    "dark":       ("#0c0d12", (28, 30, 40, 0.82),   "#e3e4e9", "#5e8ff7"),
    "scientific": ("#e8ebef", (252, 253, 254, 0.94), "#1e2733", "#0ea5e9"),
    "rosalind":   ("#f4ede0", (251, 246, 236, 0.92), "#2e261f", "#485940"),
    "hitech":     ("#02060d", (8, 22, 38, 0.84),     "#e3f7ff", "#00d4ff"),
    "sakura":     ("#fdf2f4", (255, 250, 249, 0.92), "#3a1f24", "#d04c61"),
    "icecream":   ("#fff8f3", (255, 255, 255, 0.92), "#3d2a3b", "#c5234a"),
    "retro8bit":  ("#1a0d2e", (28, 18, 50, 0.92),    "#ffffff", "#ff4dff"),
    "greenwood":  ("#eef1ea", (248, 251, 240, 0.92), "#1f2a1a", "#456224"),
}


def main() -> int:
    print(f"{'theme':<11} | {'fg / body':>13} | {'accent / body':>15} | notes")
    print("-" * 70)
    issues = []
    for theme, (bg_hex, card_rgba, fg_hex, accent_hex) in THEMES.items():
        bg = hex_to_rgb(bg_hex)
        body = composite(card_rgba, bg)
        fg = hex_to_rgb(fg_hex)
        accent = hex_to_rgb(accent_hex)

        fg_body = contrast(fg, body)
        accent_body = contrast(accent, body)

        note_parts = []
        if fg_body < 4.5:
            issues.append((theme, "body text (fg vs card surface)", fg_body))
            note_parts.append("body-text FAIL")
        if accent_body < 3.0:
            issues.append((theme, "accent on card (UI elements)", accent_body))
            note_parts.append("accent-UI FAIL")

        print(
            f"{theme:<11} | {fg_body:>6.2f} {verdict(fg_body):>5} | "
            f"{accent_body:>6.2f} {verdict(accent_body):>7} | {' '.join(note_parts)}"
        )

    print()
    print("Issues vs WCAG AA (body text >= 4.5, UI elements >= 3.0):")
    if not issues:
        print("  None — all 9 themes pass at AA.")
        return 0
    for t, kind, r in issues:
        print(f"  • {t}: {kind} = {r:.2f}")
    # Non-zero exit so CI can gate on contrast regressions.
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
