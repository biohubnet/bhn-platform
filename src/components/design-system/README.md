# Design System

Adaptive UI primitives that switch their rendering based on the **platform-wide design system** an admin selected.

## Two axes — one per-user, one admin-managed

| Axis              | Controls                          | Picker                                       | Storage                                                |
|-------------------|-----------------------------------|----------------------------------------------|--------------------------------------------------------|
| **Color theme**   | Hues, surfaces, typography, radius| `<ThemePicker />` in sidebar footer (any user)| `localStorage: bhn-theme` — **per-user preference**   |
| **Design system** | Layout vocabulary, chrome, hero   | `/admin/design-system` page (admin only)     | `PlatformSetting.activeDesignSystem` — **platform-wide** |

The platform picks **one** design system; every user sees the same layout vocabulary. Color theme stays a per-user preference, so users can run **Dark + Cinematic** or **Light + Cinematic** independently — but they don't get to pick between Classic and Cinematic themselves.

## Current registry

- `classic` — card-based, structured, calm. Default.
- `cinematic` — full-bleed gradient hero, eyebrow labels, hairline dividers, gradient-text stats. Brand-stage feel.

## How a page uses it

```tsx
import { DSPageHeader, DSSection, DSStatGrid, DSStat } from "@/components/design-system";
import { Pipette, Users, Activity } from "lucide-react";

<DSPageHeader
  eyebrow="Admin · platform"
  title="AutoPipette"
  icon={Pipette}
  description="One paragraph subtitle."
/>

<DSStatGrid>
  <DSStat icon={Users} label="Opted in" value={142} help="83% of 170" tone="brand" />
  <DSStat icon={Activity} label="Active 7d" value={94} help="distinct users" tone="violet" />
</DSStatGrid>

<DSSection eyebrow="Last 30 days" title="Helpfulness by card" icon={Sparkles}>
  …table…
</DSSection>
```

The same JSX renders as:

- **Classic** — bordered rounded cards, simple header, grid of stat boxes
- **Cinematic** — gradient hero with auroras, eyebrow + gradient-text title, hairline-bordered sections, divide-x stat row with gradient-text numbers

No conditional rendering in page code. The branching lives inside each primitive.

## Primitives

| Component        | What it adapts                                                       |
|------------------|----------------------------------------------------------------------|
| `DSPageHeader`   | Simple header ↔ cover banner with auroras + gradient-text title      |
| `DSSection`      | Rounded card ↔ hairline-bordered with eyebrow + optional tint        |
| `DSStatGrid`     | Grid of cards ↔ single row with `divide-x` hairlines                 |
| `DSStat`         | Card stat ↔ gradient-text number with subtle uppercase label         |
| `DSEyebrow`      | Plain uppercase label ↔ wider tracking + leading gradient hairline   |
| `DSCoverBanner`  | (Cinematic-only) Full-bleed hero with 5 auroras + SVG noise overlay  |

## Adding a new design system

1. **Append** an entry to `src/lib/design-system/registry.ts`:
   ```ts
   { id: "minimal", name: "Minimal", description: "Bare-bones, no chrome.", category: "experimental" }
   ```
2. **Teach** each primitive how to render under the new id. The pattern in every primitive:
   ```ts
   const { designSystem } = useDesignSystem();
   if (designSystem === "minimal") return /* minimal JSX */;
   if (designSystem === "cinematic") return /* cinematic JSX */;
   return /* classic JSX — the fallback */;
   ```
   Anything you don't override falls through to Classic — the admin picker stays usable while you build out the new system incrementally.
3. **(Optional)** Add CSS hooks in `globals.css` keyed on `[data-design-system="minimal"]` if you need raw selectors.
4. **Document** the new entry in this file's "Current registry" section above.
5. The admin picker at `/admin/design-system` will surface the new option automatically — no UI changes needed.

## How activation works

- Server: the root layout calls `getActiveDesignSystem()` from `src/lib/settings.ts`, which reads `PlatformSetting` keyed by `activeDesignSystem`. Falls back to `classic` if the row is missing or invalid.
- The id is stamped on `<html data-design-system="…">` server-side — no client roundtrip, no flash.
- `<DesignSystemProvider value={...}>` mounts inside `<Providers>` with the same id, so `useDesignSystem()` returns it everywhere.
- When an admin commits a change on `/admin/design-system`, the API upserts the `PlatformSetting` row and `router.refresh()` re-renders with the new attribute. All other users pick up the change on their next navigation.

## Adding a new primitive

Drop a file in this directory. Mark it `"use client"`, call `useDesignSystem()`, and branch on `id`. Export from `index.ts`. Pages can immediately consume it via the barrel import.

## Anti-patterns

- **Don't** branch on the design system inside page code. The whole point is to keep page code declarative. If you need new behavior, add a prop or build a primitive.
- **Don't** assume the user's choice on the server. The pickers are client-side; server-rendered HTML is always Classic and gets re-styled on hydration via `data-design-system` on `<html>`.
- **Don't** import `DesignSystemProvider` directly from page code. It's mounted once in `src/app/providers.tsx`.
