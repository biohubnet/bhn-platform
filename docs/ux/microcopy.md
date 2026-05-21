# Microcopy — voice & tone

This is the platform's voice guide. It's deliberately short. When in
doubt, read the examples and copy the pattern.

The canonical interface reference is `docs/design-system.md` (also
mirrored at `/admin/design-system`). This document is its sibling —
how the *words* on every surface should sound and read.

## Principles

### 1. Plain, direct, professional
Trainees, mentors, and employers are all adults using a serious tool
to do serious work (apply for jobs, fund research, hire interns).
The tone is **plain professional** — closer to a respected colleague's
email than a marketing site's home page. No exclamation marks. No
"excited to introduce!" copy. No emoji in product UI.

### 2. The user is "you"; the platform is "we" (sparingly)
- ✅ "Your edits save automatically."
- ✅ "We share your application with vetted partners."
- ❌ "Edits will be saved." (passive — avoid)
- ❌ "BHN will share your application." (third-person — avoid)

Use "we" only when the platform is *doing something for or to* the
user. Don't sprinkle "we" everywhere — most copy reads better in the
imperative or with "you" as the subject.

### 3. Imperative for actions
Button labels and action microcopy are imperative verbs.

- ✅ "Save", "Apply", "Delete", "Tailor to posting"
- ❌ "Saving" (use only when actually in-flight)
- ❌ "You can save here" (verbose)

### 4. Past tense for done state
- ✅ "Saved · v12"
- ✅ "Submitted on May 12"
- ❌ "Save successful"

### 5. Numbers, units, and naming
- Always show numerals for counts in UI: "3 comments", "12 applications".
- Currency: "$5,000" not "5000".
- Dates: short relative for under a week ("3 days ago"), absolute thereafter ("May 12").
- Company / role names: as the user typed them. Don't title-case.

### 6. No clichés, no filler
Avoid: "passionate", "team player", "dynamic", "rockstar",
"streamline", "synergy", "in this digital age", "in today's fast-paced
environment", "let's get started", "you're all set", "awesome",
"excited to".

## Form fields

### Labels
- Title-Case for field labels: "Job title", "Expected graduation"
- Lowercase action verbs in helper buttons: "save", "rewrite", "tailor"

### Placeholders that teach
Placeholders should be example values, not repeated labels.

- ✅ `placeholder="May 2025"` (under a Start-date input)
- ✅ `placeholder="GPA 3.8 / 4.0 · optional, omitted if empty"`
- ❌ `placeholder="Enter your start date"`

### Helper text
Inline subhead under the field. Tells the user what happens when this
field is empty or what its scope is. ≤ 12 words.

- ✅ "Optional — omitted from your final resume if blank."
- ✅ "Visible to mentors. Not shared with employers."

## Empty states

Every list / index page must have an empty state. The shape:

1. **Icon** (single lucide glyph, 28-32px, opacity 50)
2. **Headline** — one short sentence, what's missing.
3. **Subhead** — one short sentence, what to do about it.
4. **Primary action** — button or link that gets them out of the empty state.

Example:

> 📂  *(icon)*
> **No folders yet.**
> Start one for each role you're applying to — it holds the JD,
> your tailored resume, a cover letter, and the interview prep guide.
>
> `[+ Create your first folder]`

Anti-patterns:

- ❌ Just "No items." — leaves the user stranded.
- ❌ Long marketing copy explaining what the feature does — they're already on the page.
- ❌ Tutorial videos or splash images — slow + visually loud.

## Error messages

Three rules:

1. **Say what happened in plain language.** Not "Error 500" or "AI didn't return a usable rewrite."
2. **Suggest a recovery.** "Try again", "Add a job description first", "Check your network."
3. **Don't blame the user.** Even if it's their input, frame it as a request.

Examples:

- ✅ "Couldn't save your edits — check your connection and we'll retry."
- ✅ "Add a job description first — the AI needs something to tailor to."
- ❌ "AI didn't return a usable rewrite." (technical leakage)
- ❌ "Invalid input." (which? what should I fix?)
- ❌ "You forgot to enter a job description." (blamey)

## Confirmations

Three tiers, gated by how much work is at risk:

### Tier 1 — no gate
Routine, easily reversible actions. No confirmation.
- Delete a single comment from a thread (undo via the post-action recovery panel).
- Hide a sidebar item from your view (re-enable any time in preferences).
- Archive a row (soft, recoverable).

### Tier 2 — `window.confirm()`
Moderate-risk actions. Modal browser confirm with a specific message.
- Batch operations affecting multiple rows.
- Anything that resets several minutes of work.
- Reverting to a prior version (work between source and now stays in history; net effect is recoverable but inconvenient).

Pattern: state the action + state the impact in plain numbers.

> "Permanently delete 3 resumes? Comments + revisions go with them."

### Tier 3 — `LaunchSwitch`
Irreversible actions that cost real work to undo.
- Hard-delete a resume / job folder.
- Wipe an entire workspace.

The cover-flip + 5-second countdown is the confirmation. **Don't
stack a `window.confirm()` on top of a LaunchSwitch.** That's UX
ceremony for ceremony's sake — pick one.

See `/admin/design-system` for the LaunchSwitch component.

## Sidebar + nav labels

- Title-Case for nav items: "Resume tailoring", "Application Tracker"
- Avoid acronyms-without-context. "RPG", "EQUIP" are fine because
  they have a tooltip — but a first-time user shouldn't need the
  tooltip to guess what the section *is*.
- Section headers in ALL-CAPS with letter-spacing: "ENGAGE",
  "EXPERIENCE", "MY PROFILE".

## What this isn't

- It's not a brand voice doc (that lives in marketing).
- It's not a copywriting style guide (no rules about Oxford commas).
- It's not a complete dictionary — when something genuinely doesn't
  fit any of the patterns above, write what reads well and add the
  pattern here in the next PR.

## See also

- `docs/design-system.md` — visual language + components.
- `/admin/design-system` — live reference for components.
- `src/lib/onboarding/tours.ts` — onboarding step copy.
- `src/lib/changelog/entries.ts` — changelog entry voice (longer-form
  but same plain-direct register).
