# Design critique — `/admin/insights`

**Reviewer:** Solo + AI (single-reviewer caveat — see "Sign-off")
**Date:** 2026-05-13
**Surface:** Brand-new, just shipped in commit `ffb5507`

## Surface under review

- **Route:** `/admin/insights`
- **Components:**
  - `src/app/(dashboard)/admin/insights/page.tsx` (server)
  - `src/components/admin/insights/InsightEditor.tsx` (client)
- **API:** `POST /api/admin/insights`, `POST /api/admin/insights/publish`

## What this surface is for

One admin reads the period's user signals (theme votes, exit-survey responses, access requests, pending-queue depth), writes a 1–3 paragraph "what users told us" synthesis, and optionally publishes it to `/changelog` so the loop closes back to users.

## Charter outcomes served

**Outcome 3** primarily (transparency — closing the loop between user signal and platform response). Indirectly Outcome 2 (admin's ability to act on signal in a structured cadence).

## Heuristic walk-through

| # | Heuristic | Score (1–4) | Notes |
|---|---|---|---|
| 1 | **Visibility of system status** | 2 | "Last saved" timestamp appears in the header after a save, and a green flash confirms publish. Pre-first-save state is correct ("never published" via the conditional)… **but** the editor doesn't surface "you have unsaved changes" while typing. An admin who types for 10 min and then closes the tab loses the draft. |
| 2 | **Match with user vocabulary** | 3 | "Synthesis", "period", "publish to changelog" — all platform-native vocabulary. The placeholder text in the textarea models the expected shape (3 observations + what we'll do about it), which is the more important affordance. |
| 3 | **User control + freedom** | 2 | Can save, can re-save, can re-publish. **Cannot undo a publish** (the changelog row stays); can only re-publish or hard-delete from changelog admin. The "Re-publish" button (vs. fresh publish) signals the idempotency but doesn't fully resolve the "I clicked too soon" recovery story. |
| 4 | **Consistency with platform patterns** | 4 | Uses the established `admin-glow` ring on the destructive-ish "Publish" button, the standard primary-button style for Save, the standard banner pattern for errors + flashes. SignalCard pattern mirrors the existing dashboard tile shape. |
| 5 | **Error prevention** | 3 | Empty-body submission is caught client-side with a friendly message. Publish requires a saved row (disabled state + tooltip). Server validates period length (32 char) + body length (8000 char). What's *not* prevented: typo in period name (`"2026-5"` vs `"2026-05"`) — these create different rows that look the same. |
| 6 | **Recognition over recall** | 3 | Right-column signal feeds put the source material next to the editor — admin doesn't have to remember what was in `/themes` last week. The placeholder structure ("Three observations") is a recognition aid. **Could be better:** showing the most recent published synthesis from a prior period as a "this is what last month looked like" reference. |
| 7 | **Flexibility + efficiency** | 3 | Period field is free text, supports YYYY-MM / YYYY-WW / release-N. Keyboard shortcuts not wired (no Cmd-S to save). Most admins will write here weekly-to-monthly — keyboard shortcut would compound. |
| 8 | **Aesthetic + minimalist** | 4 | Clean two-column layout. Each signal card has exactly one source link + a small handful of rows — nothing on screen that doesn't earn its place. Helper copy under the textarea ("Markdown supported. Aim for 100–400 words.") is the kind of guidance an editor surface should provide without overexplaining. |
| 9 | **Recover from errors** | 3 | Both API failures (save, publish) surface a rose-50 banner with the verbatim error message. The publish-disabled-when-unsaved state has a tooltip. **Missing:** what to do if a publish succeeds but the changelog row gets manually deleted later — the `publishedChangelogId` would point to a dead row. Edge case; current behaviour is a 404 on the changelog side, not a crash, so call this acceptable. |
| 10 | **Help + documentation** | 2 | The header copy explains the loop. There's no inline link to `docs/ux/charter.md` or to a one-line explanation of "what makes a good synthesis". For a surface that's both important and infrequent (monthly), this is a real gap — admins forget how to do it well between uses. |

**Average heuristic score: 2.9 / 4 — solid Practiced quality.** No 1s; two 2s (status visibility + control freedom), three 3s, three 4s, two more 4s.

## Charter-specific checks

| Check | Status |
|---|---|
| **Outcome 1 (trainee path):** does this surface stay under 90 seconds of task time? | N/A — admin-only surface. |
| **Outcome 2 (admin path):** does this surface support < 60 seconds per pending item? | Mostly. The act of *synthesizing* legitimately takes 20–40 minutes; that's the work. Once written, save + publish is < 5 sec. The signal-feed cards keep "reading the signal" colocated, which is what matters. |
| **Outcome 3 (transparency):** if user-visible, is there a corresponding `changelog` entry queued? | ✅ The whole point of the Publish button. |

## Top three changes before next iteration

1. **Add "unsaved changes" indicator + browser-leave guard** (≈ 30 min in `InsightEditor.tsx`). Track a `dirty` flag against `initialBody`; render a small amber dot next to the period field while dirty; bind `beforeunload` to warn if dirty + busy=false.
2. **Inline help: "What makes a good synthesis"** (≈ 15 min). A small collapsible `<details>` block above the editor with 4–5 bullet points pulled from `docs/ux/templates/research-entry.md`. Most admins will forget the pattern between monthly uses.
3. **Cmd/Ctrl-S to save** (≈ 10 min). The editor is fundamentally a writing surface; keyboard-first deserves the keyboard shortcut.

Estimated total: under 1 hour. Worth doing before the next monthly synthesis lands.

## Open questions to validate post-ship

- **Does the placeholder-modeled structure actually shape what admins write?** Or do they delete the placeholder and write freeform? Hypothesis: structure helps for the first 2–3 uses, then ignored. Falsifiable by reading the first 6 synthesis rows when they land.
- **Is monthly the right cadence?** Hypothesis: weekly is too noisy (signals haven't accumulated), quarterly is too slow (insights go stale). Monthly default is the bet; revisit at the 6-month mark.
- **Should the publish action notify users (banner / email)?** Currently it just lands in `/changelog`. If `/changelog` is rarely visited, the loop doesn't close. Worth measuring `/changelog` page-view rate after the first published synthesis.

## Sign-off

- **Reviewer:** AI (Claude Opus 4.7), structured-critique mode, single-reviewer
- **Date:** 2026-05-13
- **Verdict:** **Ship as-is** — the three improvements above are quality polish, not blockers. Ship the surface, exercise it once with a real synthesis, then iterate.
- **Caveat:** single-reviewer + AI-reviewer. A second human pass should happen before this is treated as definitive. The findings above are best-effort but unvalidated against participant data.
