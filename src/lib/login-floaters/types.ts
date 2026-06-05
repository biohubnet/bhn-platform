/**
 * Shared types for the /login periphery-floater system.
 *
 * A "floater" is one of the looping process-animation SVG glyphs
 * in `src/components/branding/*` (AntibodyBinding, DnaTranscription,
 * MscCultureCycle, etc.) — they sit in the dark periphery of the
 * /login backdrop and drift / pulse / cycle through their stages
 * as ambient atmosphere.
 *
 * Until now the active floaters were hardcoded in
 * src/app/(auth)/login/page.tsx. The admin surface at
 * /admin/login-floaters now drives this via the
 * `loginFloaters` PlatformSetting (a JSON array of FloaterInstance).
 */

export interface FloaterPosition {
  /** Which edge the floater sits on. */
  side: "left" | "right";
  /** Vertical position as a CSS percent (0 = top, 100 = bottom).
   *  Roughly bands the floater into a top / mid / bottom band
   *  inside its side column. */
  verticalPct: number;
}

export interface FloaterInstance {
  /** Stable id mapping into FLOATER_REGISTRY. Unknown ids are
   *  dropped at load time. */
  id: string;
  position: FloaterPosition;
  /** Optional size override (default from registry). */
  size?: number;
  /** Tailwind text-color class (currentColor inherits onto the
   *  SVG strokes). Example: `text-emerald-300/30`. */
  colorClass?: string;
  /** lab-swim variant — drives the gentle drift translate the
   *  floater rides on. One of: lab-swim · lab-swim-slow ·
   *  lab-swim-rev · lab-swim-drift. */
  swimClass?: string;
}

/** Platform-wide master switches for the two ambient layers on the
 *  /login backdrop. Stored in a PlatformSetting row separate from the
 *  floater array (so the list logic stays untouched), and set from
 *  /admin/login-floaters. `floatersEnabled` gates the drifting
 *  molecules (<LoginFloaters>); `sparklesEnabled` gates the twinkle
 *  (<DeepSeaStars>). Both default ON. The /login page also exposes a
 *  per-visitor menu that can only dim a layer locally — the effective
 *  visibility is `global AND device`. Kept in this prisma-free types
 *  file so the client editor can import the type without pulling the
 *  server config (which imports prisma). */
export interface LoginFloaterFx {
  floatersEnabled: boolean;
  sparklesEnabled: boolean;
  /** How long (ms) the entrance stagger spreads across: on /login the
   *  floaters + sparkles fade in progressively over this window instead
   *  of all at once. 0 = appear instantly. Default 6000 (≈6s). */
  appearMs: number;
}
