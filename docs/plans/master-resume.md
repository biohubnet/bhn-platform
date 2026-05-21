# Master resume — architectural plan

**Status:** plan only. No code lands until this is approved.
**Surface:** banner at the top of `/profile/resume?id=…` (the resume tailoring page) + a dedicated `/profile/master` page for deep work.
**Companion:** [`docs/guides/master-resume.md`](../guides/master-resume.md) — user-facing guide.

---

## The five principles

This system is *opinionated*. The opinions matter because they cascade through every other design decision.

### 1. One library, many drafts

Your **master** is the single source of truth for every accomplishment you've ever written down. Every "tailored resume" is a **draft** pulled from the master — short-lived, role-specific, disposable.

> Mental model: master = your wardrobe; tailored resumes = today's outfit. You don't reinvent the wardrobe for every outfit. You pick from it.

Practical consequence: the resume editor is no longer where you *write* — it's where you *select*. Writing happens in the master.

### 2. Bullets are first-class

The unit of work in this system isn't "the resume" or "the section" — it's **the bullet**. Each bullet has:

- Its own id (stable across drafts)
- Its own revision history
- Tags (user- or AI-applied: `upstream`, `GMP`, `Python`, `leadership`)
- An anchor (which section + which job/project it belongs under)
- An embedding (for AI retrieval)
- A current text + every prior version

> Mental model: bullets are like commits. They have history. They can be cherry-picked across resumes. They never silently disappear.

Practical consequence: the master is a **library of bullets**, not a library of resumes.

### 3. AI is a librarian, not an author

The AI **does not write new bullets out of thin air**. It does two things:

1. **Retrieves** — given a job posting, finds the 12 most relevant bullets from your master via embedding similarity + LLM re-ranking.
2. **Rewrites lightly** — adjusts language to match the posting's vocabulary (e.g. "cell culture" → "mammalian cell culture" if the JD uses that phrasing).

Your accomplishments stay yours. The AI helps you find and frame them, not invent them.

> If the master is empty, AI can't tailor anything. Build the library first.

### 4. Two-way sync (with a checkpoint)

Edit a bullet inside a tailored resume? You see a chip: **"Promote this edit to the master?"**

- **Yes** → master bullet gets a new revision; future AI tailoring uses the improved version
- **No** → the edit lives only inside this draft

Same in reverse: bullets dragged from master into a draft are *references*, not copies, until you edit them. Once edited, the link becomes "derived from master bullet X".

> The master never silently absorbs changes. Every promotion is explicit. This protects you from polluting your library with one-off rewrites.

### 5. Snapshots are like git tags

Most of the time the master is a fluid library — bullets shift, get edited, get archived. Occasionally you want to **lock the current state** with a name and a date. That's a **snapshot**.

- Snapshots are immutable
- Snapshots have version numbers (`v1`, `v2`, `v3`, …) auto-incremented per user
- Snapshots are downloadable as PDF or JSON
- Snapshot filename: `master-resume_<your-name>_v<n>_<date>.pdf`

> Take a snapshot before any big rewrite. Take one after a milestone (got a job, finished a degree). Snapshots are cheap.

---

## Data model

### New Prisma tables

```prisma
/// A user's master resume — a library of every bullet they've
/// written. Singleton per user.
model MasterResume {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation("UserMasterResume", fields: [userId], references: [id], onDelete: Cascade)

  /// Shared header data — name, email, phone, location.
  /// One source of truth for these fields across every tailored
  /// resume the user owns.
  header    Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  bullets   MasterBullet[]
  snapshots MasterSnapshot[]
}

/// A single accomplishment / line item in the master library.
/// Lives independently of any Resume row. Tailored resumes can
/// reference these bullets, edit them locally, or promote edits
/// back here.
model MasterBullet {
  id              String       @id @default(cuid())
  masterId        String
  master          MasterResume @relation(fields: [masterId], references: [id], onDelete: Cascade)

  /// Which section kind this bullet belongs to.
  /// Mirrors ResumeSectionKind in src/lib/resume/types.ts.
  sectionKind     String

  /// For experience-type bullets, the anchor identifies the job
  /// (e.g. "Manufacturing Process Intern · STEMCELL Technologies").
  /// Skills bullets have no anchor. Project bullets anchor on
  /// project name. Stored loose (free text) — anchors are a UX
  /// affordance for grouping, not a foreign key.
  anchorTitle     String?
  anchorSubtitle  String?
  anchorDateRange String?

  /// Current bullet text.
  body            String

  /// User- or AI-applied tags. Used by the AI picker to short-list
  /// relevant bullets before LLM re-ranking.
  tags            String[]

  /// Source attribution. If this bullet was first added by promoting
  /// it from a tailored Resume, this records that Resume's id.
  /// Helps the user trace lineage.
  sourceResumeId  String?

  /// Pin order within the section / anchor group.
  position        Int          @default(0)

  /// Soft archive — bullets the user doesn't currently want
  /// surfaced in AI tailoring or library views, but might revive.
  isArchived      Boolean      @default(false)

  /// Embedding for AI retrieval (Cloudflare bge-small-en-v1.5, 384d).
  embedding       Unsupported("vector(384)")?
  /// The text that produced the current embedding. If `body` !=
  /// `embeddingText`, the embedding is stale and gets re-computed
  /// on the next AI pick.
  embeddingText   String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  revisions       MasterBulletRevision[]

  @@index([masterId, sectionKind, isArchived])
  @@index([masterId, anchorTitle])
}

/// Per-bullet revision history. New revision row written on every
/// substantive body change (5-min coalesce window like the existing
/// Resume revisions, see scripts/coalesceRevisions.ts).
model MasterBulletRevision {
  id        String       @id @default(cuid())
  bulletId  String
  bullet    MasterBullet @relation(fields: [bulletId], references: [id], onDelete: Cascade)

  body      String
  tags      String[]

  /// Why was this revision made? "user_edit" | "ai_rewrite" |
  /// "promoted_from_resume" | "imported_from_pdf"
  source    String

  createdAt DateTime     @default(now())

  @@index([bulletId, createdAt])
}

/// Locked, named, downloadable snapshot of the master at a moment
/// in time. Like a git tag.
model MasterSnapshot {
  id            String       @id @default(cuid())
  masterId      String
  master        MasterResume @relation(fields: [masterId], references: [id], onDelete: Cascade)

  /// Auto-incremented per master. v1, v2, v3...
  versionNumber Int
  /// User-supplied label. "Fall 2026 polish", "Pre-graduation", etc.
  name          String

  /// Full snapshot of the master's bullets + header at this moment,
  /// stored as ResumeContent JSON so the snapshot can be rendered
  /// in the existing /profile/resume/preview PDF flow.
  content       Json

  /// Pre-generated PDF for download. Optional — the download
  /// endpoint regenerates if absent.
  pdfUrl        String?

  createdAt     DateTime     @default(now())

  @@unique([masterId, versionNumber])
  @@index([masterId, createdAt])
}
```

### Migration outline

1. Three CREATE TABLE statements
2. Foreign key + unique constraints
3. Index creation
4. `pgvector` extension assumed already enabled (it's used by the existing skill embedding code)

---

## API surface

```
GET    /api/profile/master
  Returns the master + all non-archived bullets grouped by section.
  Lazy-creates a MasterResume row on first call.

PATCH  /api/profile/master
  Body: { header: { name, email, phone, location } }
  Updates the shared header fields.

GET    /api/profile/master/bullets[?archived=true&kind=experience]
  Filtered list of bullets.

POST   /api/profile/master/bullets
  Body: { sectionKind, anchorTitle?, anchorSubtitle?, body, tags[] }
  Creates a new bullet. Auto-embeds the body.

PATCH  /api/profile/master/bullets/[id]
  Body: any subset of the bullet fields.
  Writes a MasterBulletRevision if `body` changed (with 5-min coalesce).
  Re-embeds if `body` changed.

DELETE /api/profile/master/bullets/[id][?hard=true]
  Soft-archive by default. ?hard=true wipes the row + revisions.

POST   /api/profile/master/bullets/promote
  Body: { resumeId, bulletId, mode: "create" | "update", targetMasterBulletId? }
  Promotes a tailored-resume bullet into the master.
   - mode=create → new MasterBullet from the resume bullet
   - mode=update → write a revision against targetMasterBulletId

POST   /api/profile/master/bullets/ai-extract
  Body: { resumeId }
  Crack open every bullet in the named tailored resume, dedupe
  against the master's existing bullets (by body cosine similarity),
  and bulk-create the new ones. Used to bootstrap the master from
  a user's first existing resume.

POST   /api/profile/master/snapshots
  Body: { name }
  Takes a snapshot — versionNumber = MAX(versionNumber) + 1.

GET    /api/profile/master/snapshots
  List of snapshots (id, versionNumber, name, createdAt).

GET    /api/profile/master/snapshots/[id]/download?format=pdf|json
  Returns the snapshot. Filename header:
  `master-resume_<slugified-user-name>_v<n>_<YYYY-MM-DD>.<ext>`

POST   /api/profile/resume/ai-tailor-from-master
  Body: { postingId | jobDescription, resumeId, maxBullets?: 12 }
  AI tailor flow that pulls bullets from the master:
    1. Embed the JD.
    2. Cosine-search the master's bullets (non-archived).
    3. LLM re-rank top 30 → final 12 with light JD-language
       rewrites.
    4. Return a preview the user can accept / reject per-bullet.
    5. On accept, replace the section's bullets in the target
       resume with the chosen set.

POST   /api/profile/resume/pull-from-master
  Body: { resumeId, masterBulletIds[], targetSectionId, position? }
  Drag-and-drop pull — inserts master bullets into the named
  section of the named tailored resume.
```

---

## UI surface

### A. The banner (`/profile/resume?id=…`)

A collapsible banner at the top of the resume tailoring page.

**Collapsed (default for users who have a master with ≥1 bullet):**

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📚 Master · 47 bullets · 4 sections · v3 · last updated 2h ago    [▼]  │
└────────────────────────────────────────────────────────────────────────┘
```

**Expanded:**

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📚 Master resume                                                       │
│ Your library of every bullet you've ever written. Pull from it, push   │
│ to it. AI uses it to tailor for postings.                              │
│                                                                        │
│ 47 bullets · 4 sections · last snapshot v3 (May 17)                    │
│                                                                        │
│ ┌──────────────────────┐ ┌────────────────────┐ ┌──────────────────┐   │
│ │ Pull from master ↓   │ │ AI tailor for      │ │ Promote edits to │   │
│ │ Drag bullets into    │ │ this role          │ │ master ↑         │   │
│ │ this draft           │ │ Pick + rewrite     │ │ Push this draft's│   │
│ │                      │ │ 12 best bullets    │ │ improvements back│   │
│ └──────────────────────┘ └────────────────────┘ └──────────────────┘   │
│                                                                        │
│ [Open master library] [Take snapshot] [Download v3] [▲ Collapse]       │
└────────────────────────────────────────────────────────────────────────┘
```

**Empty state (user has no master yet):**

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📚 You don't have a master resume yet                                  │
│ Build one library of every bullet you've ever written, then pull from  │
│ it on every tailored draft.                                            │
│                                                                        │
│ [Start one from this draft] [Open master]                              │
│                                                                        │
│ Or: Master grows automatically — every time you edit a bullet here     │
│ you'll be asked if you want to promote it.                             │
└────────────────────────────────────────────────────────────────────────┘
```

### B. The deep page (`/profile/master`)

A dedicated page for working WITH the master directly.

- Section tabs: Experience · Skills · Projects · Education · Certifications · Other
- Within Experience, a sub-grouping by anchor (job)
- Each bullet row: text, tags chips, edit button, archive button, revision history disclosure
- Drag handles for reordering within a section / anchor group
- Search/filter: full-text over body + tag chips
- Right rail: snapshot list with download links

### C. The promotion chip (in the resume editor)

When a user edits a bullet that's been pulled from the master:

```
┌────────────────────────────────────────────────────────────────────────┐
│ "Ran 14 shake-flask cultures across HEK293 + CHO-K1, holding           │
│  contamination below 2% across the rotation."                          │
│                                                                        │
│ Edited from master bullet · [Promote edit to master] [Keep local only] │
└────────────────────────────────────────────────────────────────────────┘
```

If the user picks "Keep local only", the chip dismisses but the prompt re-appears the next time the body is edited.

### D. The AI tailor preview (a modal / drawer)

Triggered from the banner's "AI tailor for this role" button.

```
┌────────────────────────────────────────────────────────────────────────┐
│ AI tailor — Sanofi · Upstream Scientist II                             │
│                                                                        │
│ I read the posting + searched your master (47 bullets). Here are       │
│ 12 I'd put on this resume, lightly rewritten to match the posting's    │
│ language. Accept any subset.                                           │
│                                                                        │
│ ┌─ EXPERIENCE ────────────────────────────────────────────────────┐    │
│ │ ☑ "Ran 14 shake-flask cultures (HEK293 + CHO-K1) below the      │    │
│ │    2% contamination threshold."     [Why this bullet? ▼]        │    │
│ │ ☑ "Authored an upstream SOP rollover…"                          │    │
│ │ ☐ "Maintained a Smartsheet deviation log…"                      │    │
│ │   (low relevance — they want upstream specifically)             │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│ ┌─ SKILLS ────────────────────────────────────────────────────────┐    │
│ │ ☑ Cell culture · shake-flask + bioreactor sampling              │    │
│ │ ☑ Aseptic technique                                             │    │
│ │ ☐ Python · pandas / matplotlib (not requested in posting)       │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│ [Accept selection (8)]  [Adjust manually]  [Cancel]                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## AI retrieval algorithm

1. **Inputs:** job description (or posting id) + user's master bullet set + target `maxBullets`.
2. **Embed JD:** Cloudflare `bge-small-en-v1.5` (384d), same as existing skill matcher.
3. **Cosine search:** rank all non-archived master bullets by `1 - cosine_distance(jd_embedding, bullet.embedding)`. Take top 30.
4. **LLM re-rank:** feed the JD + top 30 to Gemini Flash (Cloudflare Llama fallback). Prompt asks for:
   - `picked: bullet_id[]` (final ≤12)
   - `rewrites: { bullet_id → suggested_body }` — light JD-language adjustments only
   - `reasons: { bullet_id → "why" string ≤20 words }` — shown in the preview
5. **Preview** — never auto-apply. User accepts subset.
6. **Apply** — for each accepted bullet:
   - Insert into the target section of the target resume
   - Record as `derivedFromMasterBulletId` so the promotion chip can detect future edits

If the master is empty (0 bullets), the tailor button is disabled with a tooltip: *Build your master library first — see the banner above.*

---

## Version control

Two levels of versioning, intentionally separate:

### Bullet-level revisions (continuous)

Every substantive edit to a `MasterBullet.body` writes a `MasterBulletRevision` row. Five-minute coalesce window — within that window, updates overwrite the most recent revision instead of stacking. After 5 minutes, a fresh revision is written.

UI: each bullet has a "history" disclosure that shows its last 10 revisions with timestamps + the `source` (`user_edit` / `ai_rewrite` / `promoted_from_resume` / `imported_from_pdf`).

### Master-level snapshots (discrete)

When the user clicks "Take snapshot", we:

1. Increment `versionNumber` for this master
2. Write a `MasterSnapshot` row with the full content tree at this moment + a user-supplied name
3. Optionally generate a PDF and store its URL (lazy: generated on first download if absent)

Snapshots are immutable. They never change after creation. The list is shown in the deep page's right rail with download buttons.

Snapshot filename convention:
```
master-resume_<slug>_v<n>_<YYYY-MM-DD>.pdf
master-resume_<slug>_v<n>_<YYYY-MM-DD>.json
```

Example: `master-resume_jane-doe_v3_2026-05-21.pdf`

---

## Download

`GET /api/profile/master/snapshots/[id]/download?format=pdf|json`

- `format=pdf` → re-uses the existing `/profile/resume/preview` print-styled HTML rendering, served via Next's response stream with `Content-Disposition: attachment; filename=…`.
- `format=json` → returns the full content tree as serialised JSON.

The download endpoint is the only place that generates the filename — both client and server use the same `formatSnapshotFilename(user, snapshot, ext)` helper.

---

## Migration story (for existing users with resumes but no master)

When a user with at least one existing `Resume` row first visits `/profile/master`:

1. We don't pre-populate silently — that would be opinionated about which bullets to import.
2. We show an empty state: "Want us to seed your library from your existing resumes?"
3. If they say yes → run `ai-extract` on their most-recently-edited non-archived `Resume`, dedupe by cosine similarity, bulk-create `MasterBullet` rows.
4. If they say no → master stays empty; they build it manually.

For new users with no `Resume` rows, the banner on `/profile/resume?id=…` shows the "Start one from this draft" path described in **A. The banner**.

---

## What this plan does NOT include (future work)

- Multi-user sharing of master bullets (e.g. instructor sharing example bullets with trainees)
- Tag taxonomy curation (currently free-form strings)
- Bulk re-embed job when the embedding model changes
- Bullet-level analytics ("which bullets land most in callbacks?")
- Master-to-master comparison / diff view

---

## Build sequence (when approved)

1. **Schema + migration** — three tables, indexes, pgvector column
2. **API: master CRUD** — endpoints 1-6 above (no AI yet)
3. **API: ai-extract** — bootstrap from existing resume
4. **`/profile/master` deep page** — list / edit / archive / drag-reorder
5. **Banner on `/profile/resume?id=…`** — wired to existing endpoints
6. **AI tailor flow** — embed JD, cosine search, LLM re-rank, preview drawer
7. **Pull-from-master drag interaction** — within the resume editor
8. **Promotion chip** — on edited-from-master bullets
9. **Snapshots + download** — version locking, filename helper, PDF + JSON paths
10. **Onboarding tour step + changelog entry**

Each step is independently shippable. Steps 1-2 unlock the rest; everything after that can land in any order.

---

## Risks + open questions

1. **Embedding cost / latency.** AI tailor runs an embedding on the JD + ~30 cosine searches per master bullet. At our scale this is sub-second, but worth measuring on the first deploy.
2. **What's the "right" master size?** Power users could end up with 200+ bullets. The cosine pre-filter handles this fine. UI on `/profile/master` might need virtualisation past ~100 rows.
3. **Should tags be free-form or controlled?** Free-form is simpler; controlled vocabulary makes AI picking sharper. Plan starts free-form; can revisit.
4. **Conflict handling on promote.** What if the user edits master bullet X on the master page WHILE another tab has a draft pointing at the same bullet, and they then promote a draft edit? The draft promotion creates a new revision; the master page's edit is the *previous* revision. Both are preserved in history; the master shows the latest. Acceptable.
5. **PDF rendering of the master itself.** The master isn't a "resume" — it has every bullet across every job, which would be hundreds of lines. The downloadable snapshot may need a different print layout from the regular `/profile/resume/preview`. TBD.
