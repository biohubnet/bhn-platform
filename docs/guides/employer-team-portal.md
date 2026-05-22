# Employer team portal — user guide

**TL;DR.** The employer portal works as a shared workspace for your HR team. Invite teammates, see who's doing what, and coordinate on candidates without stepping on each other.

---

## What changed

The portal used to be a one-person tool — one HR account, one set of postings, one user. Now it's a **company workspace** that maps to how an HR team actually works:

- The portal belongs to your **company**, not to you personally.
- Each **posting has its own hiring team** — a recruiter, a hiring manager, and optional interviewers — so notifications target the right people instead of pinging everyone.
- Every action is **attributed** to the teammate who took it, and **@mentions** in comments push a notification to the person you tagged (in-app + email).
- **Email templates** + **bulk actions** make sending 30 rejections a 30-second job, not a 90-minute job.
- **Scorecards** give multiple interviewers a structured place to leave comparable feedback on the same candidate.
- A **"What's new for you" strip** on the Overview answers the question every returning recruiter asks first: *what changed while I was out?*

> Mental model: think of the portal as Slack + Greenhouse stitched together — your team coordinates in comments and templates, the portal is the source of truth, and notifications + email digests trigger you to come back when something needs you.

---

## Getting set up in under 5 minutes

If you're an existing employer account: **nothing changes for you on day one.** Your company is auto-created, you're the Owner, and your existing postings are auto-tagged to your company. You can keep working exactly as you did.

When you're ready to bring teammates on:

### Way 1 · Auto-suggest from your domain

When a colleague signs up with the same email domain (`@sanofi.com`), they see a panel:

> *We found **Sanofi Canada** (3 members). Request to join, or create a new workspace?*

If they click **Request to join**, you (the Owner) see the request in your team panel and approve with one click. Their role is pre-suggested from their job title — you can override before approving.

### Way 2 · Bulk invite — paste a list

In the team panel → **Invite teammate** → paste a block of emails:

```
sarah.lin@sanofi.com, Senior Recruiter
marcus.hu@sanofi.com  Generalist
priya.k@sanofi.com    Talent Partner
```

Each line gets a suggested role from the title. Edit any row. Hit **Send invites**. Done.

### What ships pre-loaded

Every new company arrives with **4 starter email templates** (rejection-early, rejection-post-interview, interview invitation, offer follow-up) and **1 starter interview scorecard**. They're editable — but you can use them day 1 without writing anything.

---

## Who can do what (the four roles)

Permissions are by role. There are four:

| Role | Typical title | What they can do |
|---|---|---|
| **Owner** | HR Director, VP People | Everything — including inviting/removing teammates and transferring ownership. Usually one per company. |
| **Manager** | HR Manager, Talent Partner | Create/edit/close postings, advance candidates, send offers, hire. Can invite Managers, Generalists, Viewers. |
| **Generalist** | HR Generalist, Recruiter | Create postings, advance candidates, schedule interviews, comment. Can't send offers or hire. |
| **Viewer** | Hiring manager (stakeholder), exec, auditor | Read-only — can see everything and comment, but can't change stages or send offers. |

If you're not sure what role you have, look in the sidebar's team chip — your name shows up with your role next to it.

---

## Inviting a teammate

If you're an Owner or Manager:

1. Click your team chip at the top of the sidebar → **Invite teammate**.
2. Enter their email, pick a role, optionally add their job title and a personal note.
3. Hit **Send invite**.

They get an email with a single-use link. When they click it:
- If they already have an account, they sign in and land in your workspace.
- If they're new, they go through the signup flow first.

You'll see the pending invite in the team panel until they accept it. You can resend or revoke it at any time.

> Inviting an Owner requires you to be an Owner yourself.

---

## Seeing what your team is doing

Three places to look:

### 1. Inline attribution chips (everywhere)

Every posting row, every applicant card, every queue item shows the last teammate who touched it:

> Touched by **Sarah Lin** · 14m ago

If a teammate is currently looking at the same applicant as you, you'll see their avatar with a soft ring next to the applicant's row:

> ⓘ **Priya is viewing this now**

This isn't tracking — it's just helping you avoid stepping on each other's work.

### 2. The team panel

Click the team chip at the top of the sidebar (or go to `/employer/team`). You'll see:
- Every teammate, their role, their title, and when they were last active.
- What each person is currently looking at (if anything).
- An **Invite teammate** button if you have the role for it.

### 3. The activity feed (`/employer/activity`)

A reverse-chronological log of everything attributable that's happened in your workspace — postings created, candidates shortlisted, offers sent, members invited.

You can filter by:
- **Type** (postings, applicants, members, offers)
- **Date range**
- **Actor** (one specific teammate)

Useful when you come back from vacation and want to see what your team did while you were away.

### 4. The "What's new for you" strip on Overview

When you land on `/employer`, the brand-stage banner stays for company identity — but a personalised strip sits right under it answering *what changed for me?*:

- New @mentions you haven't read
- Candidates awaiting your action on reqs you're the recruiter for
- Interview scorecards you owe
- New teammates who joined

One click opens whatever needs you. This is the "what changed since I logged out" you used to get from your inbox — now consolidated.

### 5. The notifications bell

Next to the team chip in the sidebar header. Click to see your inbox: @mentions, new applicants on your reqs, scorecards your colleagues submitted, members who joined.

In **Notification preferences** (`/employer/preferences`) you can set:
- In-app notifications: on / off
- Email — immediate (every notification): on / off (default: off, except @mentions which always notify)
- Email — daily digest: on / off (default: on, sent 8am)
- Mute specific kinds (e.g. "owner oversight" if you'd rather not see every member-joined event)

---

## Hiring teams per posting

Each posting has its own **hiring team** — the people actually working on this req:

| Slot | Who they are |
|---|---|
| **Recruiter** | Day-to-day owner of the pipeline. Triages applicants, schedules screens. One per posting. |
| **Hiring Manager** | The stakeholder making the final call. One per posting. |
| **Interviewers** | People doing structured interviews — they fill scorecards. |
| **Observers** | Watching but not interviewing. Read access. |

The hiring team appears as a chip on the posting header:

> Recruiter ◐ **Sarah** · Hiring Mgr ◐ **Marcus** · +2 interviewers   [Edit]

**Defaults at posting creation:**
- The creator becomes the **Recruiter**.
- Every Manager + Owner on the company is auto-added as an **Observer** (they can opt out individually if they don't want the noise).
- The Hiring Manager slot is offered as a dropdown but optional — left blank if you don't know yet.

Notifications on a candidate go to the candidate's posting's hiring team first — the whole company doesn't get pinged.

---

## @mentions

In a candidate's **Team discussion** tab, type `@` and start a teammate's name. A picker shows the people on this posting's hiring team (with a "show all" toggle for the rare case the right person isn't on the team yet).

Picking a name turns into a chip in your comment. When you post:
- The mentioned person gets an in-app notification on the bell.
- Depending on their prefs, they also get an immediate email or wait for the daily digest.

This is the primary way you ask a teammate to do something. Examples:

> @Marcus can you phone-screen her? She's strong on culture.

> @Priya I scheduled her for Thursday 2pm — your scorecard prompt should be live.

> @Sarah holding on advance — references came back lukewarm. Discuss?

---

## Email templates + bulk actions

### Why this matters

The single biggest time-sink in any HR workflow: writing the same email 40 times. The portal collapses that into one template + one bulk send.

### Editing templates (`/employer/templates`)

Owners and Managers can edit templates. The editor has merge variables like `{{candidateFirstName}}`, `{{postingTitle}}`, `{{interviewerName}}` — the right side shows a live preview with sample data so you can see exactly what each recipient will get.

Common merge variables:
- `{{candidateFirstName}}`, `{{candidateLastName}}`
- `{{postingTitle}}`, `{{companyName}}`
- `{{interviewerName}}`, `{{interviewDateTime}}`
- `{{senderFirstName}}`, `{{senderSignature}}`

Hit **Send test to me** to mail yourself a rendered preview before going live.

### Single-candidate send

On any candidate row, click **Email →** to pick a template. The preview opens with merge variables resolved. Edit the subject/body if you need to personalise, then send. The send is logged in the candidate's history.

### Bulk actions on the pipeline

Multi-select candidates on a posting (checkboxes on each row). A toolbar appears at the bottom:

> **12 selected** · [Advance to ▾] [Reject with template ▾] [⋯]

**Reject with template** opens a preview showing the email for the first candidate rendered with merge variables. A tabbed strip lets you flip through all 12 to sanity-check each one. One CTA → bulk send + bulk stage change to "rejected" in a single transaction.

> Generalists are capped at 25 recipients per bulk send. Managers and Owners have no per-call cap (but there's a 100/day total per user to prevent runaway sends).

---

## Interview scorecards

When multiple people interview the same candidate, you need structured comparable feedback — not just unstructured comments.

### Setting up the rubric (per posting)

Each posting has one scorecard rubric — a set of 3-7 criteria you grade each interviewee against. New companies get a starter rubric pre-loaded:

- Skills match
- Communication
- Culture fit
- Motivation
- Overall recommendation

Owners / Managers can edit the rubric on the posting detail page → **Scorecard rubric**. Once the first interviewer submits, the rubric soft-locks (Owner can still edit, others can't) — this stops the comparison view from breaking under in-flight submissions.

### Filling in a scorecard (per interviewer, per candidate)

After an interview, you fill in your scorecard:
- Score each criterion on the rubric's scale (1-4 or 1-5)
- Add a per-criterion note (optional)
- Pick an overall recommendation: Strong yes / Yes / No decision / No / Strong no
- Write a summary (optional)

While in **draft**, only you see your scorecard. Once you click **Submit**, the rest of the hiring team can see it.

### Side-by-side comparison view

On a candidate's **Scorecards** tab, every submitted scorecard renders as a column. You see everyone's scores side by side, their recommendation arrows, and their summary notes — perfect for the post-interview debrief meeting.

When every required interviewer has submitted, an aggregate banner shows the team's averaged recommendation + a one-click *Advance to offer* / *Reject (template)* shortcut.

### "Scorecard owed" reminders

If you've interviewed a candidate but not submitted your scorecard, you get a notification on the bell + on the Overview strip until you do.

---

## Coordinating on a candidate

When you expand a candidate in the workspace, there's a new tab: **Team discussion**.

It's a threaded conversation scoped to that candidate on that posting. Use it to:
- Debate fit ("Strong on cell culture, weak on regulatory — phone screen?")
- Hand off ("Booked her for Thu 2pm — Sarah, you're on the call.")
- Flag a concern ("Reference came back lukewarm — let's not rush this.")

Replies thread one level deep. Comments emit an activity-feed entry so the rest of the team can see the conversation happened.

> Team discussions are visible to anyone with access to your workspace (any role, including Viewers). They are NOT visible to the candidate.

---

## Claiming work without claiming it

Action queue items (new applications, stale candidates, awaiting-offer responses) start out **unassigned**. Click **Assign me** to mark that you're handling it — your avatar moves into the row and the rest of the team sees it's covered.

You can also **un-assign** to release a row back to the queue. No formal queue logic, no rounds, no rotations — just a lightweight way to say "I've got this."

---

## Belonging to more than one company

Some people work across multiple companies — agency recruiters, consultants, parent/subsidiary HR teams. If you're a member of more than one company, you'll see a **company switcher** in the sidebar header. Pick the company you want to work in; the rest of the portal scopes to it.

Each company has its own postings, members, activity feed, and role for you — you might be an Owner of Company A and a Viewer of Company B.

---

## Common workflows

### "I just joined a hiring team. Where do I start?"

1. Accept the invite link your teammate sent. You sign in and land on the company Overview.
2. The **"What's new for you" strip** under the banner shows what you need to look at first: @mentions, candidates awaiting you, scorecards you owe.
3. Open the team panel — see who's on the team and what they're working on.
4. Open **My Postings** → click the hiring-team chip on each posting to see which reqs you're the recruiter / interviewer / observer on.
5. Open `/employer/activity` to skim the last week's work — fastest catch-up.

### "I shortlisted three candidates. How does my team see that?"

They don't need to do anything — the next time they load the posting, the applicant cards show "Shortlisted by **You** · just now." If you want a teammate to take a specific action, **@mention** them in a team comment on the candidate — they'll get a notification on their bell + email.

### "I need to reject 30 candidates who didn't make the cut."

1. Open the posting's pipeline view.
2. Multi-select the 30 candidates.
3. In the bottom toolbar → **Reject with template** → pick "Rejection — early stage".
4. Preview the email for the first candidate (merge variables resolved). Flip through the tabbed strip to spot-check a few.
5. Hit **Send 30**.

Total time: ~60 seconds. Each candidate gets a personalised email; each ApplicationStatus row gets stage-changed to "rejected" with you as the actor; the activity feed records the bulk action.

### "Our team is interviewing a candidate this week. Make sure feedback is comparable."

1. Open the posting → **Scorecard rubric**. Edit the criteria to match what you're hiring for (or accept the starter rubric).
2. Add interviewers as **Interviewer** on the posting's hiring team.
3. Each interviewer fills their scorecard within 24h of their interview.
4. Run the debrief from the candidate's **Scorecards** tab — every submission visible side-by-side.
5. Use the aggregate banner's *Advance to offer* / *Reject (template)* shortcut once the team aligns.

### "A teammate left the company."

If you're the Owner: open the team panel, find the member, click their row's menu → **Remove**. Their CompanyMember row is deleted; everything they ever did stays attributed to them (their name keeps showing on the cards they touched).

### "I'm the only Owner and I'm leaving."

You need to transfer ownership first. In the team panel, click your own row → **Transfer ownership** → pick a Manager to promote. After the transfer, you'll be demoted to Manager and can be removed normally.

### "Someone on my team can do something I can't. Why?"

It's by role — see the table above. If you think your role is wrong, ask an Owner to change it via the team panel.

---

## What this isn't

- **Not a chat / messaging tool.** Team discussion is per-candidate. Use Slack or email for general conversation.
- **Not a productivity tracker.** We don't measure idle time, screen time, typing telemetry, or anything you'd find on a performance review. The "active 2h ago" timestamp is for coordination, not management.
- **Not Slack-native.** v1 channels are in-app notifications + email digest. Slack accept-an-invite or Slack-to-comment isn't here yet.
- **Not a calendar.** Scheduling interviews still goes through the existing "propose three time slots" flow — no Google / Outlook free-busy lookup yet.
- **Not a requisition approval pipeline.** Postings go live the moment a Manager+ creates them — no Finance / Hiring Manager sign-off chain. (Coming later if needed.)
- **Not an offer-letter generator.** The Offer model exists but is bare — templating + e-sign is its own future feature.
- **Not real-time.** Presence indicators refresh every ~20 seconds, not millisecond-by-millisecond. Activity feed updates on page load.

---

## FAQ

**Q: If I edit my company's logo, do all my teammates see the change?**
A: Yes — the company profile (logo, About, brand, industry) is shared. Only Owners and Managers can edit it.

**Q: Can a Viewer see my candidate notes?**
A: Yes — Viewers see everything, including team discussions and applicant materials. The role only restricts *mutations*, not visibility.

**Q: A teammate accidentally rejected a candidate. Can I un-reject?**
A: Yes — anyone with stage-change rights can advance the candidate back. The previous rejection stays in the activity feed for audit.

**Q: What if two of us try to advance the same candidate at the same time?**
A: Last write wins (within a couple of seconds of each other). The activity feed records both transitions so you can see what happened.

**Q: Can I share a candidate with another company?**
A: No. Each posting belongs to exactly one company; sharing across companies isn't supported. If a candidate applies to two companies, both companies see their application independently — neither sees the other's comments or stages.

**Q: How many teammates can I invite?**
A: No hard limit in v1. (We'll let you know if/when seat-based pricing kicks in.)

**Q: What happens to my work if my account is removed?**
A: Everything you did stays — postings you created, stages you advanced, comments you wrote. Attribution keeps your name on them. You just can't sign in to that workspace anymore.

**Q: I'm getting too many notifications. How do I dial them down?**
A: `/employer/preferences` → Notification preferences. Turn off the daily digest, or mute specific kinds ("owner oversight" is the noisiest if you're an Owner of a busy company). @mentions always notify regardless of mute settings — that's a deliberate floor so urgent pings always land.

**Q: I @mentioned someone but they didn't get the email. Why?**
A: Their notification preferences probably have "Email — immediate" off. They'll still see it on their bell + in tomorrow's digest. If you need them now, hit Slack.

**Q: Can I send a bulk email to candidates across multiple postings?**
A: Not in v1 — bulk actions are scoped to one posting's pipeline at a time. If you need to mail every candidate in your talent pool, that lives on the Talent Pool surface (separate flow).

**Q: Where do email sends show up?**
A: Three places. (1) On the candidate's detail view → History. (2) In the activity feed. (3) In your Notifications inbox (as "self_action" — you can mute this kind if you don't want the receipts).

**Q: A teammate edited a template I was about to use. Did my draft change?**
A: Templates are versioned via lastUpdatedAt — your draft loads the current template at the moment you opened it. If they updated it mid-compose, you'll see a banner: "This template changed 2 minutes ago — refresh to use the latest, or keep your version."

**Q: Can the candidate see my scorecard?**
A: No, never. Scorecards are internal-only to the company's hiring team. Same for team discussion comments.

**Q: I disagree with a teammate's scorecard. Can I edit theirs?**
A: No. Each interviewer owns their own scorecard. To dispute, leave a team discussion comment + @mention them.

**Q: How do I know if I'm on a posting's hiring team?**
A: The posting header shows the hiring-team chip. Click it to see all members + their roles. You can also filter `My Postings` to "Postings I'm on the hiring team for."

**Q: I left the company but my @mention email is still arriving in my inbox.**
A: When an Owner removes you, your CompanyMember row is deleted, which stops all future notifications. Existing in-flight emails (already sent before removal) still land — but the next mention won't generate one.
