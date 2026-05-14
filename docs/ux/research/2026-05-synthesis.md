# Research synthesis — May 2026

**Period:** 2026-05
**Author:** Solo + AI (synthesis based on observable platform signals, plus the three artifacts shipped 2026-05-13 — the WCAG audit, the `/admin/insights` design critique, and the Journey-01 cognitive walk-through)

This is the synthesis that's intended to land on `/admin/insights` for period `2026-05`. The canonical source is this markdown file; the live admin surface mirrors it.

---

## What we observed this period

Three distinct signals converge, two of them from artifacts we ran on 2026-05-13 (`docs/ux/audits/`, `docs/ux/critiques/`, `docs/ux/research/`) and one from the platform's existing signal-capture mechanisms.

### 1. Accessibility — one real contrast finding worth shipping a fix for

The WCAG 2.1 AA contrast sweep across all 9 themes (`docs/ux/audits/2026-05-13-wcag-aa-contrast-sweep.md`) found **one genuine issue** out of 18 contrast checks (2 per theme): the **Scientific theme's `--brand-600` accent fails the 3.0:1 minimum for UI components** on its card surface, measuring 2.70:1. Body text passes AAA across every theme; only the accent-on-card pair for one theme falls below threshold. The fix is small (~12% luminance shift on one CSS variable) and the audit doc names the target value (`#0284c7`).

The sweep also surfaced a meta-finding: the **picker SWATCH at `src/components/ui/ThemePicker.tsx` may misrepresent body-text contrast** because its third color slot isn't always the actual `--fg`. Not a contrast bug, but a "what the picker previews isn't quite what the page renders" inconsistency worth tracking.

**Action:** Ship the scientific-theme accent darken. Re-run the audit script post-fix to confirm AA pass across all 18 pairs.

### 2. Trainee onboarding — one severity-3 finding, one severity-2, two more severity-2s

The cognitive walk-through of Journey 01 (`docs/ux/research/2026-05-13-trainee-first-registration-cognitive-walkthrough.md`) surfaced 4 findings. The headline one is **severity 3**: when SMTP isn't configured (which describes our preview deploys), trainees signing up via a non-production URL get no email confirmation, and there's no fallback inline copy reassuring them the request was received and naming the support channel. The pattern is silent failure with no recovery path.

Three further findings at severity 2: no self-service "resend my invite" path; pathway discovery is scan-only (no skill filter); the onboarding-tour auto-fire for first-time trainees isn't verified to actually fire.

**The walk-through is expert review, not participant research** — these findings are hypotheses the next participant study should test, not validated truths. They go into the backlog with that caveat attached.

**Action:** Strengthen the on-screen access-request confirmation copy (severity 3) this period; queue the other three for the next.

### 3. New admin surfaces — design critique on `/admin/insights` is clean enough to ship

The single-reviewer critique of the brand-new `/admin/insights` page scored 2.9/4 average across the 10 Nielsen heuristics — solid Practiced quality, no 1s. Three small improvements (unsaved-changes indicator, inline "what makes a good synthesis" help, Cmd-S to save) were flagged at < 1 hour total. None block shipping.

What the critique implies more broadly: the new design system surfaces (`/admin/design-system`, `/admin/insights`, `/admin/experience-metrics`, `/roadmap`) have shipped with consistent patterns (admin-glow on destructive-ish actions, banners-with-icons, status-chip palettes) — the recently-documented design system isn't aspirational, it's load-bearing for the surfaces built atop it. That's the level-3 → level-4 hinge.

## What we're going to do about it

This period (commit by end of May):

1. **Ship the scientific-theme accent fix** (`docs/ux/audits/...` → `#0284c7`). Re-run `python3 scripts/audit-contrast.py` to confirm all 18 pairs pass AA. Add the script to CI as a non-blocking warning (block once all 18 are green).
2. **Strengthen the access-request confirmation copy** to include the support email + the expected response window. Log mail-send failures to `AuditLog` with an explicit "user notification dropped" entry so admin can spot patterns.
3. **Polish `/admin/insights`** with the three < 1 hr improvements from the critique. Best done before the next monthly synthesis so the writing experience improves first.

Next period (June):

4. **Pathway-discovery filter strip** by skill tag.
5. **Self-service "resend my invite" affordance** on `/login`.
6. **Verify the onboarding-tour auto-fires for first-time trainees**; fix if not.

Backlog (Q3+):

7. **Run a real 3-trainee usability test** on Journey 01 to validate or invalidate the 4 cognitive-walk-through findings.
8. **Hero-mesh + status-palette contrast audit** — extension of the May 13 sweep against the overridden per-theme classes.

## What this teaches us about our practice

Two things, reflecting on the maturity push that shipped 2026-05-13:

**First**, the gap between "having UX infrastructure" and "running UX practice" is real but smaller than expected. Inside 24 hours of shipping the design-system doc + the `/admin/design-system` page + the journey docs + the audit/critique/research templates, we ran each template at least once — and each produced a real, actionable finding. The artifacts weren't aspirational; they were drop-in.

**Second**, AI-led expert review catches a non-trivial subset of what participant research would catch, but the gap is real and worth naming. The cognitive walk-through caught likely problems with the onboarding email, the invite recovery flow, and the pathway discovery surface — all hypotheses a real trainee study would either confirm or invalidate. We should not pretend the walk-through *is* the participant study; we should note that it's the kind of artifact that fills the cadence between participant studies, which is exactly what mid-stage UX practice (Forrester level 3.5) needs.

---

## Signals referenced

- `docs/ux/audits/2026-05-13-wcag-aa-contrast-sweep.md` — algorithmic, all 9 themes
- `docs/ux/critiques/2026-05-13-admin-insights.md` — single-reviewer heuristic critique
- `docs/ux/research/2026-05-13-trainee-first-registration-cognitive-walkthrough.md` — expert review of Journey 01
- Platform's standing signal-capture mechanisms: `ThemeVote`, `ThemeProposal`, `PoolExitFeedback`, `AccessRequest`, `AuditLog`, `Event` (analytics)
- This period's changelog entries (cf. `scripts/seed-changelog.ts`)

---

*Drafted 2026-05-13 for period 2026-05. Land on `/admin/insights` for the live surface; this markdown is the canonical source.*
