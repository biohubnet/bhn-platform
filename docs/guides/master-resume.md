# Master resume — user guide

**TL;DR.** Build one library of every bullet you've ever written, then pull from it on every tailored resume. AI helps you pick which bullets fit which posting. Promote good edits back to the library.

---

## What is the master resume?

Most resume tools treat every resume as a fresh document — copy, paste, edit, save, repeat. The **master resume** flips that:

- The **master** is your single library of accomplishments. Every bullet you've ever written lives here.
- A **tailored resume** is a short-lived draft pulled from the master, focused on one role.

You write once, in the master. You pull, rearrange, and lightly customise per role — but the underlying accomplishments stay in one place.

> Wardrobe vs. outfit. You don't reinvent the wardrobe for every outfit. You pick from it.

---

## Where do I see it?

Two places:

**1. The banner at the top of every resume's edit page (`/profile/resume?id=…`)**

A thin, dismissible bar with quick actions:
- **Pull from master** — drag library bullets into this draft
- **AI tailor for this role** — let AI pick 12 best bullets and lightly rewrite them
- **Promote edits to master** — push improvements from this draft back to the library
- **Open master library** · **Take snapshot** · **Download v3**

**2. The deep page (`/profile/master`)**

Where you work *with* the master directly: add, edit, archive, tag, reorganise bullets. Snapshots and downloads live in the right rail.

---

## How do I build my master?

Three ways. Pick whichever fits where you are right now.

### Way 1 · Start from scratch

Open `/profile/master`. Add bullets manually, section by section.

Best for: people who don't have an existing resume yet, or who want to start clean.

### Way 2 · Promote from an existing resume

If you already have a tailored resume on the platform: open it, hit the banner's **"Build master from this draft"** button. The platform creates a master and copies every bullet from the draft into the library.

Best for: people who've been editing one resume on the platform for a while.

### Way 3 · AI extraction from an uploaded PDF

If you uploaded a resume PDF (via the Application Builder) but haven't structured it yet: hit **"AI extract bullets to master"** in the banner. AI reads the PDF, identifies every distinct bullet, and seeds the library.

Best for: people whose existing resume lives as a PDF and they don't want to re-type everything.

---

## How do I tailor a resume from my master?

Open the resume you want to tailor (or create a new one). In the banner, click **"AI tailor for this role"**.

**What happens:**

1. The AI reads the job description (paste it in, or pick a posting from the platform).
2. It compares the JD against every bullet in your master via embedding similarity.
3. It picks the **12 most relevant bullets**, lightly rewrites each one to match the JD's language, and shows you a preview.
4. Each suggested bullet has a tiny **"Why this bullet?"** chip you can expand to see the AI's reasoning.
5. You accept some, reject others, or accept all. Nothing changes in your master — the AI is *picking*, not editing.

**You can also pull manually.** The banner's **"Pull from master"** opens a side panel listing every master bullet grouped by section. Drag bullets into your draft's sections directly.

---

## How do I keep my master up to date?

Edit a bullet in a tailored draft? A small chip appears under that bullet:

> ⬆ Edited from master bullet. **Promote edit to master**  ·  Keep local only

**Promote to master** → the master bullet gets a new revision; future AI tailoring uses the improved version.
**Keep local only** → the edit lives only inside this draft. The master stays unchanged.

You can also edit bullets directly on `/profile/master`. Every edit there is its own revision in the bullet's history.

---

## What's version control?

Two levels — they serve different purposes:

### Bullet-level history (always on)

Every substantive edit to a master bullet writes a revision to that bullet's history. Open any bullet on `/profile/master` and expand the **History** disclosure to see the last 10 revisions with timestamps + what triggered each one (`user edit` / `AI rewrite` / `promoted from <resume>` / `imported from PDF`).

If you ever rewrite a bullet and regret it, revert from the history.

### Master-level snapshots (manual, named, dated)

A snapshot **locks the current state** of your master with a name and a version number (`v1`, `v2`, `v3`, …). Snapshots are immutable — they never change after creation.

Take a snapshot:
- Before a big rewrite ("I'm about to overhaul half my bullets")
- At a milestone ("Pre-graduation polish", "Fall 2026 master")
- As a paper trail for your own records

Each snapshot is downloadable as a **PDF or JSON file** with a versioned filename:

```
master-resume_jane-doe_v3_2026-05-21.pdf
master-resume_jane-doe_v3_2026-05-21.json
```

The PDF is print-ready. The JSON is full-fidelity (re-importable if you ever move platforms).

---

## How do I download my master?

Take a snapshot first (if you don't have one yet — snapshots are how master content becomes downloadable). Then either:

- From `/profile/master` → right rail → snapshot list → **Download (PDF)** or **Download (JSON)**
- From the banner on any resume's edit page → **Download v3** (defaults to your latest snapshot, PDF format)

If you click Download before taking a snapshot, you'll be prompted to take one. Snapshots are cheap — take as many as you want.

---

## What about archived bullets?

Bullets you don't currently want to surface (outdated jobs, skills you no longer practise) can be **archived** instead of deleted. Archived bullets:

- Don't appear in AI tailoring
- Don't appear in the "Pull from master" panel
- Still exist on `/profile/master` under the **Archived** tab
- Can be unarchived at any time

This is the right move when you're not sure if you'll need a bullet again. Delete only the ones you're certain about.

---

## What stays in the tailored draft vs. the master?

| | Master (library) | Tailored draft |
|---|---|---|
| Owns the bullet body | Yes (canonical) | No (pulled from / derived from master) |
| Can edit | Yes | Yes (edit triggers the promote chip) |
| Carries position / ordering | Yes (per section) | Yes (per draft) |
| Carries tags | Yes | Inherits at pull time |
| Carries comments from mentors | No | Yes (comments are per-draft) |
| Has a revision history | Yes (per bullet) | Yes (per draft, separate) |
| Downloadable | Yes (via snapshot) | Yes (via PDF preview) |

---

## Common workflows

### "I just got a job posting. Tailor a resume for it."

1. From `/profile/resumes` → **New resume** → name it "Sanofi Upstream Scientist II".
2. In the editor, the banner shows your master. Click **"AI tailor for this role"**.
3. Paste the JD (or pick the posting if it's on the platform).
4. Review the 12 suggested bullets, accept the ones that fit.
5. Hit **Preview PDF** to export.

Total time: ~5 minutes.

### "I rewrote a bullet on this draft and it's much better. Save it for next time."

1. Edit the bullet. The promote chip appears under it.
2. Click **Promote to master**.
3. Done. The master bullet now carries the improved version + a new revision in its history.

### "I want a record of my resume on the day I graduated."

1. Open `/profile/master`.
2. Right rail → **Take snapshot**.
3. Name it "Graduated · April 2026".
4. Download the PDF + JSON for your archive.

### "I had a great mentor session and rewrote three bullets. Push them back."

Same as the second workflow above, one bullet at a time. Or open `/profile/master`, find each bullet, and copy the rewrite manually.

(Future work: a "promote all edited bullets at once" bulk action.)

### "I accidentally promoted a bad edit to master. Undo."

1. Open `/profile/master`, find the bullet.
2. Expand its **History** disclosure.
3. Click the previous revision → **Restore**.

---

## What this isn't

- **Not a job-application tracker.** That's `/profile/job-folders`.
- **Not a place to write cover letters or interview prep.** Those live in each job folder.
- **Not where mentor comments live.** Comments are per-draft, on individual bullets in the resume editor.
- **Not auto-promoting.** Every promotion is explicit. The master never silently absorbs edits.

---

## FAQ

**Q: If I delete a master bullet, do the tailored drafts that used it lose it?**
A: No. Once a bullet is in a draft, it's a snapshot — independent of the master. Deleting from master removes it from future AI tailoring + the pull panel, but existing drafts keep their copies.

**Q: Can two of my tailored drafts share the exact same bullet?**
A: Yes — both pulled from the same master bullet. Each draft can edit its copy independently. The master only changes when you explicitly promote.

**Q: What if my master is empty when I click AI tailor?**
A: The button is disabled with a hint to build the master first. AI is a librarian — no library, nothing to pick from.

**Q: How big can my master get?**
A: As big as you want. Performance is fine into the hundreds of bullets. Embedding-based AI retrieval scales smoothly.

**Q: Does the master apply to my header too?**
A: Yes — name, email, phone, location live on the master so they're shared across every tailored resume. Edit them on `/profile/master`. They roll through every draft on the next page load.

**Q: Can I export my master and re-import on a different platform?**
A: The JSON export is full-fidelity. There's no import endpoint on another platform (you'd have to write your own), but the JSON is human-readable + structured.

**Q: Will the AI invent bullets out of nothing?**
A: No, never. AI only picks from what's in your master + lightly rewrites for language fit. If a bullet doesn't exist in the master, the AI can't suggest it.
