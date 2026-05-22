# Employer team portal — architectural plan

**Status:** plan only. No code lands until this is approved.
**Surface:** `/employer/*` — promotes the portal from a single-recruiter workspace into a shared workspace for an HR team.
**Companion:** [`docs/guides/employer-team-portal.md`](../guides/employer-team-portal.md) — user-facing guide.

---

## The five principles

The employer portal today is *single-seat*: one user signs up, owns one set of postings, and works the pipeline alone. Real hiring teams aren't shaped that way — a posting is opened by an HR Director, screened by a Generalist, advanced by a Manager, and signed off by a VP. This plan moves the portal from a single-seat tool to a **shared workspace for a hiring team**, without flipping the existing surface upside down.

### 1. The company is the account; the user is a seat

Today the "employer account" is a User row with company fields stapled on (`employerCompany`, `companyLogo`, `companyDescription`, …). That model can't carry more than one user.

Going forward:
- **Company** is the canonical entity. It owns postings, brand fields, profile copy, the wavy banner, billing, every applicant relationship.
- **User** is a *member* of zero or more companies via a `CompanyMember` junction row.
- A single user can belong to multiple companies (consulting recruiters, parent/subsidiary HR teams) — the portal shows a company switcher in that case.

> Mental model: companies are workspaces; users are people who hold keys to them. Removing a person never deletes the company's work — it just revokes their key.

### 2. Ownership moves to the company; authorship stays with the user

Every recorded action gets two attributes:
- **Owned by** the company (which workspace it belongs to)
- **Authored by** the user who took it (who clicked the button)

Postings, applicants, stage changes, comments, offers, interviews — all carry both. The current `createdById` field becomes pure *authorship* (who created this); a new `companyId` becomes the ownership boundary (who can see and act on this).

Consequence: a posting created by an HR Director stays visible to the rest of the team after she leaves. A stage change by a Generalist is forever stamped with his name even when his role changes.

### 3. Every action is attributed — on the surface, not just in the audit log

"Who did this?" is a first-class question, not a footnote. Every applicant card, every posting row, every queue item shows the last team-member who touched it, with their avatar and a relative timestamp:

> Shortlisted by **Sarah Lin** · 2h ago

Attribution is rendered everywhere a state change can happen — pipeline stage, comments, offer issued, interview scheduled. The activity feed (§D) is the deep-dive view; the inline chips are the at-a-glance view.

### 4. Team awareness without surveillance

The portal makes coordination visible, not behaviour. We surface:
- Who's currently looking at the same applicant (presence indicator on the applicant row)
- Who took the last action on this candidate
- Who's been most active in the last 7 days (gentle, on the team panel only)

We don't surface:
- Idle time, typing telemetry, screen time
- Per-user productivity scores
- Anything ranked competitively across teammates

> If a feature would make a teammate feel watched, we don't ship it. Coordination is the goal; performance management isn't ours to do.

### 5. Meet HR where they already work

Recruiters don't live in this portal. They live in **Slack, email, and their calendar** — and they cycle through their ATS only when they have to. If our team-coordination features assume people will come check the activity feed, nobody will see them.

So every coordination primitive has a push channel out of the portal, and the inbox/portal experience is *designed for the gaps between deeper work*:

- `@mention` a teammate → they get an in-app badge **and** an email / Slack ping (their choice).
- Stage advances on a candidate they're on the hiring team for → the same push channel fires.
- Daily/weekly digest email summarising what's new on their reqs, with one-click open-in-portal links.
- Email templates so the writing happens fast — recruiters never see a blank "compose" box.
- Bulk actions so a 30-candidate rejection isn't a 90-minute job.

> Mental model: the portal is the source of truth, but the inbox is the trigger. We don't ask recruiters to change where they work — we plug into it.

### 6. Permissions are by role tier, not per-feature toggles

Four tiers, hard-coded. No per-feature ACL UI — it bloats fast and confuses non-admin operators.

| Tier | Who they are | What they can do |
|---|---|---|
| **Owner** | The first user who claimed the company, typically the HR Director. One per company. | Everything below, plus invite/remove any member, transfer ownership, edit billing, delete the company. |
| **Manager** | HR Manager. Multiple allowed. | Create/edit/close postings (any), advance stages, send offers, hire, invite Generalists + Viewers. Cannot remove Owner or other Managers. |
| **Generalist** | HR Generalist / Recruiter. Multiple allowed. | Create postings, advance stages on any posting, comment, schedule interviews. Cannot send offers, cannot hire, cannot invite or remove members. |
| **Viewer** | Read-only seat — hiring manager observing, executive stakeholder, auditor. | Read everything, comment. Cannot mutate state. |

A user's permissions on a company are their tier on that company. Same user can be Owner of Company A and Viewer of Company B.

---

## HR workflow review — what we're adding to feel familiar

A recruiter who's lived in Greenhouse, Lever, Workable, or BambooHR has muscle memory for a specific set of patterns. This plan is opinionated about which of those patterns we replicate now, which we defer, and which we deliberately skip.

### Patterns we replicate in v1 (table stakes)

| Pattern | Where it lives in HR tools | What we ship |
|---|---|---|
| **Hiring team per req** | Greenhouse "Hiring Team", Lever "Job posting team" | `PostingTeamMember` junction — every posting has a recruiter, a hiring manager, optional interviewer panel. Defaults to creator + Managers; one-click edits. |
| **@mentions in comments** | Universal across modern ATSs | `mentions: String[]` on `ApplicantTeamComment` + a `Notification` fan-out. Typing `@` opens a picker of the hiring team for this req. |
| **Notifications (email + in-app)** | Lever's "Notifications", Greenhouse "Inbox" | `Notification` table + a bell in the sidebar header + a daily-digest email job. Per-user preferences (immediate / daily / off). |
| **Email templates** | Every ATS — rejection, interview invite, offer, follow-up | `EmailTemplate` per company with merge variables (`{{candidateFirstName}}`, `{{postingTitle}}`, `{{interviewerName}}`). Pre-seeded on company creation. |
| **Bulk actions on applicants** | Greenhouse / Lever bulk-reject with templated email | Multi-select toolbar on the applicant pipeline → bulk advance, bulk reject (with template picker), bulk move to talent pool. |
| **Structured interview scorecards** | Greenhouse "Scorecards" — the gold standard | `InterviewScorecard` template per posting (per-posting rubric of 3-7 criteria) + `ScorecardSubmission` per interviewer. Side-by-side comparison view. |
| **"What's new for me" landing** | Lever's home page, Workable's dashboard | A personalised digest strip on `/employer` Overview answering: my reqs' new applicants, candidates awaiting my action, @mentions I haven't read, scorecards I owe. |

### Patterns we defer to v2 (called out so we don't paint into a corner)

- **Requisition approval flows** — opening a req goes through Finance + Hiring Manager sign-off. Real but slow to model; v2.
- **Calendar integration** — Google / Outlook free-busy lookup for interview scheduling. v2; for now the existing proposed-slots flow stays.
- **Slack-native interactions** — accept-an-invite-from-Slack, comment-from-Slack. Email channel only in v1.
- **Offer letter templating + e-sign** — `Offer` model exists but is bare; templating is its own plan.
- **EEO / OFCCP demographic capture** — sensitive enough to warrant a dedicated plan with legal review.
- **Source-of-hire reporting + funnel dashboards** — needs an analytics layer; v2.

### Patterns we deliberately skip (don't fit our scale or audience)

- **Per-feature ACL grids.** Too much config for a 5-20 person hiring team; tiers are sufficient.
- **Customisable pipeline stages per req.** The existing 7-stage pipeline is universal; per-req variation is a complexity multiplier we don't need.
- **Multi-tenant white-labelling.** This is a single-vendor platform, not an ATS-as-a-platform.

---

## Frictionless onboarding — getting a team into the portal in under 5 minutes

The user said *"the less work they have to do to start using the system the better."* Every existing employer is one user; every new company starts from zero. These are the cuts to that friction:

### Auto-suggest existing companies via email domain

When a user signs up or first lands on `/employer`:

1. Parse their email's domain (`sarah@sanofi.com` → `sanofi.com`).
2. Look up `Company` rows with matching `domain`.
3. If found → show a one-click panel: *"We found **Sanofi Canada** (3 members). Request to join, or create a new workspace?"* — clicking "Request to join" issues a `CompanyJoinRequest` that the existing Owners can approve from the team panel.

This collapses the worst-case onboarding (signed up, can't find your team, emails IT) into a single click.

### Auto-detect role from job title

The signup form already collects a title field for employers. Map common titles to default roles:

| Title contains… | Suggested role |
|---|---|
| "Director", "VP", "Head of", "Chief" | **Owner** |
| "Manager", "Lead", "Senior Recruiter", "Talent Partner" | **Manager** |
| "Recruiter", "Coordinator", "Generalist", "Specialist" | **Generalist** |
| "Hiring Manager", "Engineering Manager", "Stakeholder" | **Manager** (they need to advance candidates on their req) |
| Empty / unrecognised | **Generalist** (safe default) |

The role is *suggested*, not forced — Owners reviewing join requests see the suggestion and can override before approving.

### Pre-seed every new Company with starter content

On Company creation (auto-migration or fresh signup), insert:

- **4 email templates**: "Rejection — early stage", "Rejection — post-interview", "Interview invitation", "Offer follow-up". Pre-filled with sensible merge variables; editable.
- **1 starter scorecard**: a 5-criterion generic template ("Skills match", "Communication", "Culture fit", "Motivation", "Overall recommendation"). Owners can edit / duplicate / delete.

These give the company day-1 utility without any setup. Nobody has to write a rejection email from a blank box on their first day.

### Bulk invite — paste a list

The invite modal accepts a textarea of emails (one per line, or comma-separated, or pasted from a spreadsheet column):

```
sarah.lin@sanofi.com, Senior Recruiter
marcus.hu@sanofi.com  Generalist
priya.k@sanofi.com    Talent Partner — Manager
```

Each line is parsed into `{ email, title?, role? }`; rows missing a role get the title→role auto-suggest applied; the modal previews everything before send. One CTA, one email blast.

### Default hiring team on every new posting

When a posting is created:

- Creator → added as `recruiter` on the posting's `PostingTeamMember` rows.
- Every Manager + Owner on the company → added as `observer`.
- Hiring Manager picker (single dropdown) → optional but encouraged; defaults to creator if skipped.

No separate "set up hiring team" screen. The posting is usable the moment it's created.

### Magic-link invites (no profile-setup blocker)

The invite accept link signs the user into the company *immediately* and routes them to the workspace. Profile fields (avatar, title, notification prefs) can be filled in later — they're never a precondition to acting. Same pattern as Slack's "Join workspace" flow.

---

## Data model

### New Prisma tables

```prisma
/// The employer account itself. Promoted out of the User row so a
/// company can have many member users. All company-shaped data
/// (brand, logo, profile copy, postings) hangs off this.
model Company {
  id                  String   @id @default(cuid())
  /// Canonical display name — what shows on the brand-stage banner
  /// and on every posting card. Free-form (no uniqueness constraint
  /// — two companies can share a name on different domains).
  name                String
  /// Lower-cased canonical domain (e.g. "sanofi.com"). Used to
  /// auto-join new signups whose email matches, and as the default
  /// brand-fetch target.
  domain              String?

  // ── Brand fields, all migrated from User ─────────────────────
  website             String?
  logo                String?
  logoShape           String?
  logoTransform       Json?
  brand               Json?
  industry            String?
  size                String?
  location            String?
  description         String?
  founded             String?
  mainBusiness        String?
  ticker              String?

  /// "real" | "demo" | "sandbox" — mirrors the existing User.accountKind
  /// so demo companies can be swept on expiry.
  kind                String   @default("real")
  demoExpiresAt       DateTime?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  members             CompanyMember[]
  invites             CompanyInvite[]
  postings            InternshipPosting[]
  activityEntries     EmployerActivityLog[]

  @@index([domain])
  @@index([kind, demoExpiresAt])
}

/// A user's membership in a company. (companyId, userId) is unique
/// — a user has at most one role on a given company.
model CompanyMember {
  id          String   @id @default(cuid())
  companyId   String
  userId      String
  /// "owner" | "manager" | "generalist" | "viewer"
  role        String
  /// User-supplied job title for display ("HR Director", "Talent
  /// Partner — North America"). Optional; falls back to the role
  /// label when null.
  title       String?
  /// Audit: who invited this member in. Null for the seed-owner row
  /// created during the single-seat → multi-seat migration.
  invitedById String?
  joinedAt    DateTime @default(now())
  /// Last time this member loaded any /employer/* page — drives
  /// the "active in last 7 days" chip on the team menu.
  lastSeenAt  DateTime?

  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user      User    @relation("CompanyMembership", fields: [userId], references: [id], onDelete: Cascade)
  invitedBy User?   @relation("CompanyMemberInviter", fields: [invitedById], references: [id], onDelete: SetNull)

  @@unique([companyId, userId])
  @@index([userId])
  @@index([companyId, role])
}

/// A pending invite — issued by an Owner/Manager, redeemed when the
/// invitee follows the link and accepts. Tokens are single-use.
model CompanyInvite {
  id          String   @id @default(cuid())
  companyId   String
  /// Where the invite was sent.
  email       String
  /// The role they'd hold after accepting.
  role        String
  /// Tokenised URL slug — random, sufficient entropy that we never
  /// need to rate-limit guessing.
  token       String   @unique
  invitedById String
  /// Optional personal note from the inviter, surfaced on the
  /// accept page so the invitee knows the context.
  note        String?

  status      String   @default("pending") // pending | accepted | revoked | expired
  expiresAt   DateTime
  acceptedAt  DateTime?
  acceptedById String?
  createdAt   DateTime @default(now())

  company    Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invitedBy  User    @relation("CompanyInviteSender", fields: [invitedById], references: [id], onDelete: Cascade)
  acceptedBy User?   @relation("CompanyInviteAccepter", fields: [acceptedById], references: [id], onDelete: SetNull)

  @@index([companyId, status])
  @@index([email, status])
}

/// One row per attributable team action. The activity feed reads
/// from here; inline attribution chips read from the denormalised
/// `lastTouched*` columns on ApplicationStatus / InternshipPosting
/// (kept in sync from the same write path).
model EmployerActivityLog {
  id           String   @id @default(cuid())
  companyId    String
  actorId      String
  /// "posting_created" | "posting_edited" | "posting_closed" |
  /// "stage_changed" | "applicant_commented" | "interview_scheduled" |
  /// "offer_sent" | "offer_accepted" | "applicant_hired" |
  /// "applicant_rejected" | "member_invited" | "member_joined" |
  /// "member_role_changed" | "member_removed"
  kind         String
  /// Free-form structured payload — what changed, prev/next values,
  /// reference IDs. Shape depends on `kind`; the feed renderer has
  /// per-kind copy templates.
  payload      Json
  /// Optional FKs for the common targets, so the feed can join
  /// efficiently without parsing payload JSON.
  postingId    String?
  applicantId  String?
  targetUserId String?

  createdAt    DateTime @default(now())

  company    Company             @relation(fields: [companyId], references: [id], onDelete: Cascade)
  actor      User                @relation("ActivityActor", fields: [actorId], references: [id], onDelete: Cascade)
  posting    InternshipPosting?  @relation(fields: [postingId], references: [id], onDelete: SetNull)
  applicant  User?               @relation("ActivityApplicant", fields: [applicantId], references: [id], onDelete: SetNull)
  targetUser User?               @relation("ActivityTarget", fields: [targetUserId], references: [id], onDelete: SetNull)

  @@index([companyId, createdAt])
  @@index([companyId, kind, createdAt])
  @@index([postingId, createdAt])
  @@index([applicantId, createdAt])
}

/// Threaded team discussion on a single applicant. Distinct from the
/// existing ApplicationComment (which is on EventFormSubmission for
/// talent-pool review). This one is scoped to a posting+applicant
/// pair so HR can debate fit per-role.
model ApplicantTeamComment {
  id                   String   @id @default(cuid())
  applicationStatusId  String
  authorId             String
  /// Role at write time — preserved through future role changes,
  /// same pattern as ApplicationComment.authorRole.
  authorRoleAtWrite    String
  body                 String
  /// User IDs the author @mentioned in the body. Drives the
  /// Notification fan-out. Stored as an array because the comment
  /// body is the source of truth for which @s were typed — we
  /// extract IDs at write time and pin them so future renaming /
  /// edit-of-the-body doesn't lose the original ping target.
  mentions             String[]
  /// Optional FK to a parent comment to support threaded replies.
  parentId             String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  applicationStatus ApplicationStatus     @relation(fields: [applicationStatusId], references: [id], onDelete: Cascade)
  author            User                  @relation("ApplicantTeamCommentAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  parent            ApplicantTeamComment? @relation("ApplicantTeamCommentReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies           ApplicantTeamComment[] @relation("ApplicantTeamCommentReplies")

  @@index([applicationStatusId, createdAt])
}

/// Who's working on this specific req. A posting has one recruiter
/// (the day-to-day owner of the pipeline), zero or one hiring
/// manager (the stakeholder making the final call), and 0..N
/// interviewers/observers. The team membership defaults from the
/// posting create endpoint (creator → recruiter, Managers →
/// observers) but is editable from the posting detail page.
///
/// This is the targeting scope for notifications: @-pings on a
/// candidate notify the posting's team first, not the whole company.
model PostingTeamMember {
  id        String   @id @default(cuid())
  postingId String
  userId    String
  /// "recruiter" | "hiring_manager" | "interviewer" | "observer"
  /// A posting has at most one recruiter and at most one
  /// hiring_manager (enforced in app code; not at DB level so we
  /// can do swaps in one transaction).
  role      String
  addedById String?
  addedAt   DateTime @default(now())

  posting InternshipPosting @relation(fields: [postingId], references: [id], onDelete: Cascade)
  user    User              @relation("PostingTeamMembership", fields: [userId], references: [id], onDelete: Cascade)
  addedBy User?             @relation("PostingTeamAdder", fields: [addedById], references: [id], onDelete: SetNull)

  @@unique([postingId, userId])
  @@index([userId])
  @@index([postingId, role])
}

/// Pending invite that hasn't been actioned yet — a user signed up
/// with @sanofi.com but no Owner has approved them into Sanofi
/// Canada's workspace. Owners + Managers see these in the team
/// panel and approve / decline.
model CompanyJoinRequest {
  id          String   @id @default(cuid())
  companyId   String
  requesterId String
  /// Pre-filled from title→role auto-detect at request time.
  suggestedRole String
  /// Optional message from the requester ("Just joined Sarah's
  /// team — please add me as a Generalist.").
  note        String?
  status      String   @default("pending") // pending | approved | declined | superseded
  decidedById String?
  decidedAt   DateTime?
  createdAt   DateTime @default(now())

  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  requester User    @relation("CompanyJoinRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  decidedBy User?   @relation("CompanyJoinDecider", fields: [decidedById], references: [id], onDelete: SetNull)

  @@unique([companyId, requesterId, status])
  @@index([companyId, status])
}

/// Reusable email body per company. Pre-seeded on company creation
/// with a starter set; editable from /employer/templates.
///
/// Bodies support double-curly merge variables resolved at send
/// time: {{candidateFirstName}}, {{candidateLastName}}, {{postingTitle}},
/// {{companyName}}, {{interviewerName}}, {{interviewDateTime}},
/// {{senderFirstName}}, {{senderSignature}}.
model EmailTemplate {
  id          String   @id @default(cuid())
  companyId   String
  /// User-facing label ("Rejection — early stage", "Interview
  /// invitation"). Free-form.
  name        String
  /// Stage / kind hint so the bulk-action picker can suggest the
  /// right template: "rejection" | "interview_invite" | "offer" |
  /// "follow_up" | "general".
  kind        String
  subject     String
  body        String
  /// Pre-seeded starter templates are marked so the UI can show a
  /// "Starter" chip; users can still edit or delete them.
  isStarter   Boolean  @default(false)
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  createdBy User?   @relation("EmailTemplateAuthor", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([companyId, kind])
}

/// A per-posting rubric — N criteria the team grades each
/// interviewee against. Owners / Managers define this for a posting
/// (or accept the company's starter scorecard); each interviewer
/// fills in one ScorecardSubmission per candidate they meet.
model InterviewScorecard {
  id        String   @id @default(cuid())
  postingId String
  /// Free-form criteria definitions. JSON array shape:
  ///   [{ id: cuid, label: "Cell culture experience",
  ///      description?: "...", scale: 1-4 | 1-5 }]
  criteria  Json
  /// Per-posting flag — once an Owner locks the rubric, only Owners
  /// can edit it (prevents in-flight comparison rows from shifting
  /// under interviewers).
  locked    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posting     InternshipPosting    @relation(fields: [postingId], references: [id], onDelete: Cascade)
  submissions ScorecardSubmission[]

  @@unique([postingId])
}

/// One interviewer's filled-in scorecard for one candidate.
model ScorecardSubmission {
  id                  String   @id @default(cuid())
  scorecardId         String
  applicationStatusId String
  interviewerId       String
  /// { [criterionId]: { score: number, note?: string } } —
  /// keyed by the criterion ids defined in the scorecard.
  scores              Json
  /// "strong_yes" | "yes" | "no_decision" | "no" | "strong_no" —
  /// the final recommendation regardless of per-criterion scores.
  recommendation      String?
  /// Free-text summary the interviewer writes after the meeting.
  summary             String?
  /// Submission lifecycle: "draft" | "submitted". Drafts are
  /// visible only to the author; submitted scorecards are visible
  /// to the posting's hiring team.
  status              String   @default("draft")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  submittedAt         DateTime?

  scorecard         InterviewScorecard @relation(fields: [scorecardId], references: [id], onDelete: Cascade)
  applicationStatus ApplicationStatus  @relation(fields: [applicationStatusId], references: [id], onDelete: Cascade)
  interviewer       User               @relation("ScorecardInterviewer", fields: [interviewerId], references: [id], onDelete: Cascade)

  @@unique([scorecardId, applicationStatusId, interviewerId])
  @@index([applicationStatusId, status])
}

/// Per-user fan-out from activity-log events the user cares about.
/// One Notification row per (user × event). Drives both the in-app
/// inbox (sidebar bell) and the daily digest email.
///
/// Created by the `writeEmployerAction` helper as a fan-out step
/// after every activity-log write: it looks at the kind + the
/// posting's hiring-team + @mentions to decide which users get a
/// row.
model Notification {
  id              String   @id @default(cuid())
  userId          String
  companyId       String
  /// FK back to the activity-log row that triggered this (so
  /// rendering can re-use the feed's per-kind copy templates).
  activityLogId   String
  /// Why does this user care? Drives the inbox grouping + the
  /// digest-email subject line:
  ///   "mention"            — explicitly @-tagged
  ///   "hiring_team"        — they're on the req's PostingTeamMember
  ///   "owner_oversight"    — Owner-only signal (member joined, etc)
  ///   "self_action"        — confirmation of an action they took
  reason          String
  readAt          DateTime?
  /// Set when the daily digest has included this row, so we don't
  /// double-send.
  digestSentAt    DateTime?
  createdAt       DateTime @default(now())

  user        User                 @relation("NotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  company     Company              @relation(fields: [companyId], references: [id], onDelete: Cascade)
  activityLog EmployerActivityLog  @relation(fields: [activityLogId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt])
  @@index([userId, digestSentAt])
}

/// Per-user notification preference per company. Lazy-created on
/// first read with sensible defaults.
model NotificationPreference {
  id          String  @id @default(cuid())
  userId      String
  companyId   String
  /// Channel toggles. Defaults: in-app on, email immediate off,
  /// email digest on (daily 8am).
  inAppOn     Boolean @default(true)
  emailImmediateOn Boolean @default(false)
  emailDigestOn    Boolean @default(true)
  /// Cadence for the digest: "daily" | "weekly" | "off".
  digestCadence    String  @default("daily")
  /// Per-reason mute toggles ("hiring_team", "owner_oversight",
  /// "self_action"). @mentions always notify.
  mutedReasons     String[]

  user    User    @relation("NotificationPrefUser", fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([userId, companyId])
}
```

### Existing-table additions

```prisma
model InternshipPosting {
  // ... existing fields kept as-is ...

  /// NEW. Company that owns this posting. Required after migration.
  /// `createdById` keeps its meaning ("the user who first created
  /// this") but stops being the ownership filter.
  companyId         String?
  company           Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)

  /// NEW. Denormalised last-touch attribution for inline chips.
  /// Updated on every mutation by the posting update service.
  lastTouchedAt     DateTime?
  lastTouchedById   String?
  lastTouchedBy     User? @relation("PostingLastTouch", fields: [lastTouchedById], references: [id], onDelete: SetNull)

  // ... existing relations ...
  teamComments      ApplicantTeamComment[] @relation("PostingTeamComments") // back-relation through ApplicationStatus

  /// NEW. Hiring team for this req.
  teamMembers       PostingTeamMember[]
  /// NEW. Optional per-posting rubric — at most one.
  scorecard         InterviewScorecard?

  @@index([companyId, status, createdAt])
}

model ApplicationStatus {
  // ... existing fields kept as-is ...

  /// NEW. Denormalised last-touch attribution, same pattern as
  /// posting. The existing `updatedById` already records who last
  /// edited the row — `lastTouchedById` is the same idea, kept as a
  /// distinct column so we can update it on comment writes too
  /// (which today don't touch `updatedById`).
  lastTouchedAt   DateTime?
  lastTouchedById String?
  lastTouchedBy   User? @relation("StatusLastTouch", fields: [lastTouchedById], references: [id], onDelete: SetNull)

  teamComments    ApplicantTeamComment[]
  /// NEW. Scorecards filled in by interviewers for this candidate.
  scorecards      ScorecardSubmission[]
}

model User {
  // ... existing fields kept as-is ...

  /// NEW. Membership rows for every company this user belongs to.
  companyMemberships CompanyMember[] @relation("CompanyMembership")
  /// NEW. Activity log back-relations.
  activityActions    EmployerActivityLog[] @relation("ActivityActor")
  /// + ApplicantTeamComment, CompanyInvite back-relations (omitted for brevity)
}
```

### What we DON'T migrate off User (yet)

The User row's `employerCompany`, `companyLogo`, `companyIndustry`, … stay in place during the transition. The first migration **mirrors** these onto the new `Company` row but doesn't drop them. After all read paths have moved to Company, a later migration drops the User-side fields. This keeps the rollout reversible.

---

## Permissions matrix

The four tiers map to concrete capabilities. Anything not in this table requires an Owner.

| Action | Owner | Manager | Generalist | Viewer |
|---|:---:|:---:|:---:|:---:|
| View postings + applicants | ✓ | ✓ | ✓ | ✓ |
| Comment on applicants | ✓ | ✓ | ✓ | ✓ |
| Create posting | ✓ | ✓ | ✓ |  |
| Edit any posting | ✓ | ✓ |  |  |
| Edit posting they created | ✓ | ✓ | ✓ |  |
| Close / reopen posting | ✓ | ✓ |  |  |
| Delete posting | ✓ | ✓ |  |  |
| Advance applicant stage | ✓ | ✓ | ✓ |  |
| Schedule interview | ✓ | ✓ | ✓ |  |
| Send offer | ✓ | ✓ |  |  |
| Mark hired / rejected | ✓ | ✓ |  |  |
| Edit company profile (logo / About / brand) | ✓ | ✓ |  |  |
| Invite member (Manager / Generalist / Viewer) | ✓ | ✓ |  |  |
| Invite another Owner | ✓ |  |  |  |
| Change member role | ✓ |  |  |  |
| Remove member | ✓ |  |  |  |
| Transfer ownership | ✓ |  |  |  |
| Delete company | ✓ |  |  |  |
| View billing | ✓ |  |  |  |
| Edit posting's hiring team | ✓ | ✓ | own postings only |  |
| Submit a scorecard (when assigned as interviewer) | ✓ | ✓ | ✓ | ✓ |
| Lock the scorecard rubric | ✓ |  |  |  |
| Edit / create email templates | ✓ | ✓ |  |  |
| Send bulk email via template | ✓ | ✓ | ✓ (≤25 recipients) |  |
| Approve / decline join requests | ✓ | ✓ |  |  |

The matrix is enforced server-side by a single `requireCompanyRole(companyId, minTier)` helper that every employer route calls before any mutation. UI buttons reflect the same matrix — disabled with a tooltip ("Generalists can't send offers — ask an Owner or Manager") rather than hidden, so the team has visibility into what their teammates can do.

---

## API surface

```
GET    /api/employer/companies
  Companies the current user is a member of. Drives the company
  switcher when the user belongs to >1.

GET    /api/employer/companies/[id]
  Full company profile + the caller's role on it.

PATCH  /api/employer/companies/[id]
  Body: any subset of brand/profile fields.
  Requires Manager+.

  All existing /api/employer/profile read/write paths get rewritten
  to thread through here once the migration is done.

GET    /api/employer/companies/[id]/members
  All members + their roles, titles, lastSeenAt.

POST   /api/employer/companies/[id]/members/invite
  Body: { email, role, title?, note? }
  Requires Manager+ (Owner+ for role=owner).
  Creates a CompanyInvite + emails the recipient.

POST   /api/employer/companies/[id]/members/[memberId]/role
  Body: { role }
  Requires Owner.

DELETE /api/employer/companies/[id]/members/[memberId]
  Requires Owner. Cannot remove the last Owner — the request fails
  with 409 + a hint to transfer first.

POST   /api/employer/companies/[id]/transfer
  Body: { newOwnerUserId }
  Owner-only. Demotes the current Owner to Manager, promotes the
  target to Owner.

GET    /api/employer/invites/[token]
  Anonymous endpoint — returns the company name + inviter name +
  role label so the accept page can render before login.

POST   /api/employer/invites/[token]/accept
  Authenticated. Creates the CompanyMember row, marks the invite
  accepted, redirects to /employer.

POST   /api/employer/invites/[token]/decline
  Marks the invite declined (status="revoked" + acceptedById=current
  user for audit).

GET    /api/employer/companies/[id]/activity[?cursor=…&kind=…&postingId=…]
  Paginated activity feed. Cursors are EmployerActivityLog.createdAt
  (newest first). Optional filters: kind, posting, applicant, actor.

GET    /api/employer/applicants/[applicationStatusId]/comments
POST   /api/employer/applicants/[applicationStatusId]/comments
  Thread of team comments on a single applicant. POST writes an
  activity entry too.

GET    /api/employer/presence/[applicationStatusId]
  Returns the list of teammates who've loaded this applicant in the
  last 60 seconds. Heartbeat-based — implementation note below.

GET    /api/employer/companies/[id]/join-requests
POST   /api/employer/companies/[id]/join-requests/[reqId]/approve
POST   /api/employer/companies/[id]/join-requests/[reqId]/decline
  Owner/Manager-only. Approve creates the CompanyMember at the
  suggested role (or whatever role the approver picks during the
  approve action — they can override).

POST   /api/employer/signup/domain-suggest
  Body: { email }
  Returns: { existingCompanies: [{ id, name, memberCount }], suggestedRole }
  Anonymous endpoint — called on the registration form and on
  /employer's first-load if the user has no CompanyMember rows yet.

GET    /api/employer/postings/[id]/team
POST   /api/employer/postings/[id]/team
PATCH  /api/employer/postings/[id]/team/[memberId]
DELETE /api/employer/postings/[id]/team/[memberId]
  Per-posting hiring team CRUD. POST body:
    { userId, role: "recruiter"|"hiring_manager"|"interviewer"|"observer" }
  Manager+ on the company OR creator on the posting can edit.

GET    /api/employer/companies/[id]/templates
POST   /api/employer/companies/[id]/templates
PATCH  /api/employer/companies/[id]/templates/[templateId]
DELETE /api/employer/companies/[id]/templates/[templateId]
  Email template CRUD. Manager+ to write.

POST   /api/employer/applicants/[applicationStatusId]/email
  Body: { templateId, overrides?: { subject?, body? } }
  Renders the merge variables for this candidate, sends via the
  platform's existing transactional-email service, logs the send in
  the activity feed.

POST   /api/employer/postings/[id]/applicants/bulk
  Body: {
    applicationStatusIds: string[],
    action: "advance"|"reject"|"move_to_pool",
    templateId?: string,           // required if action=reject
    targetStage?: string,          // required if action=advance
    overrides?: { subject?, body? }
  }
  Generalists capped at 25 recipients/call.

GET    /api/employer/postings/[id]/scorecard
PATCH  /api/employer/postings/[id]/scorecard
  Per-posting rubric. POST creates if absent; PATCH updates.

GET    /api/employer/applicants/[applicationStatusId]/scorecards
POST   /api/employer/applicants/[applicationStatusId]/scorecards
PATCH  /api/employer/applicants/[applicationStatusId]/scorecards/[submissionId]
  Per-interviewer submissions for one candidate. Draft until
  status="submitted"; once submitted it's visible to the whole
  hiring team and shows in the side-by-side comparison view.

GET    /api/employer/notifications[?unread=true]
PATCH  /api/employer/notifications/[id]/read
PATCH  /api/employer/notifications/read-all
  The sidebar bell. Cursor-paginated by createdAt.

GET    /api/employer/notifications/prefs/[companyId]
PATCH  /api/employer/notifications/prefs/[companyId]
  Per-user-per-company preference editor.

GET    /api/employer/inbox
  The "What's new for you" digest that powers the Overview strip.
  Returns:
    {
      mentions: Notification[],        // unread @-pings, newest first
      pendingActions: QueueItem[],     // postings *you're* on as
                                       // recruiter/HM with new triage
                                       // or stale candidates
      scorecardsOwed: ScorecardOwed[], // interviews you've done
                                       // without submitting a card
      digestSummary: string            // human-readable headline
    }
```

### Email sender — single rendering path

All outgoing emails (templated single send + bulk + invite + digest) flow through one `sendEmployerEmail` helper that:
1. Resolves merge variables against the candidate + posting + sender context.
2. Wraps the rendered HTML in the company's standard footer + reply-to header.
3. Logs the send (per-recipient) into the activity feed and into the candidate's history.

This guarantees that "what got sent" is consistent across every entry point and audit-loggable in one place.

### Daily digest job

A daily cron at 08:00 UTC (per-user timezone aware later):
1. Find every user with `NotificationPreference.emailDigestOn = true` and at least one Notification with `digestSentAt = null`.
2. Group their notifications by company → render the digest email.
3. Stamp `digestSentAt` on the included rows.

`@mention` notifications with `emailImmediateOn = true` (the per-user opt-in) bypass the digest and fire on write.

### Presence implementation

Presence is intentionally cheap — no websockets, no separate service:
- When a member loads an applicant row (expand on the workspace, or `/employer/postings/[id]/applicants/[appId]`), the page POSTs `{ companyId, applicationStatusId, userId, expiresAt = now + 60s }` to a `presence_pings` table that's polled by other clients every 20 seconds.
- The table is swept by a daily Vercel cron clearing rows past their `expiresAt + 1 day` window.
- A SWR hook on each row shows the avatars of currently-pinging members.

This is good enough for hiring teams — we don't need millisecond accuracy, we need "is Sarah looking at this right now."

---

## UI surface

### A. The team menu in the sidebar

Above the existing **EMPLOYER PORTAL** group in the sidebar, a compact team chip:

```
┌────────────────────────────────────────┐
│ Sanofi Canada · HR Team                │
│ ◐◐◐ +5  Sarah · Marcus · Priya · You   │
└────────────────────────────────────────┘
```

Clicking it opens a slide-in drawer with the full team panel.

### B. The team panel drawer (`/employer/team` deep page + sidebar drawer)

A list of every CompanyMember with:
- Avatar + name + title
- Role chip (Owner / Manager / Generalist / Viewer)
- "Active 2h ago" relative timestamp
- "Looking at: Jane Doe · Bioprocess Intern" if currently pinging a row
- Per-row menu (Owner-only): change role, remove member, resend invite

Top of the drawer:
- **Invite teammate** button (opens the invite modal)
- Member-count summary chip ("9 members · 1 Owner · 2 Managers · 5 Generalists · 1 Viewer")

The drawer doubles as `/employer/team` for deep linking + bookmarking.

### C. Inline attribution everywhere

Three patterns, used consistently:

**On a posting row in the workspace:**
```
┌────────────────────────────────────────────────────────────────────┐
│ Bioprocess Intern — Toronto                          12 applicants │
│ Created by Sarah Lin · last edit by Marcus Hu · 2h ago        [▾]  │
└────────────────────────────────────────────────────────────────────┘
```

**On an applicant card (inside an expanded posting):**
```
┌────────────────────────────────────────────────────────────────────┐
│ ◐ Jane Doe                                  Shortlisted            │
│   Touched by Sarah · 14m ago     ⓘ Priya is viewing this now       │
└────────────────────────────────────────────────────────────────────┘
```

**On an action-queue item:**
```
┌────────────────────────────────────────────────────────────────────┐
│ New triage · Bioprocess Intern · Jane Doe                          │
│ Submitted 3h ago · unassigned        [Assign me] [Open]            │
└────────────────────────────────────────────────────────────────────┘
```

The "unassigned" state plus the [Assign me] action gives the team a soft way to say "I've got this" without a formal claim system.

### D. The activity feed (`/employer/activity`)

A reverse-chronological feed of every attributable action on this company. Each row:

```
┌────────────────────────────────────────────────────────────────────┐
│ ◐ Sarah Lin   shortlisted   Jane Doe   on   Bioprocess Intern      │
│   14m ago                                              [Open card] │
└────────────────────────────────────────────────────────────────────┘
```

Top of the page:
- Filter strip: All / Postings / Applicants / Members / Offers
- Date range chip
- Actor chip (filter to a specific teammate)

The feed has no notifications surface in v1 — it's a read-only audit + coordination view. Notifications (Slack, email) are explicitly out of scope (§"What this plan does NOT include").

### E. The invite flow

Manager+ clicks **Invite teammate** in the team panel:

```
┌────────────────────────────────────────────────────────────────────┐
│ Invite a teammate                                                  │
│                                                                    │
│ Email           [ marcus.hu@sanofi.com                          ]  │
│ Role            [ Generalist ▾ ]   Title (opt.) [ Talent Partner ] │
│ Personal note   [ Hey Marcus — pulled you in to help on the    ]   │
│                 [ upstream req queue. Let me know if you need  ]   │
│                 [ context. — Sarah                             ]   │
│                                                                    │
│ ⓘ Generalists can advance applicants but can't send offers.        │
│                                                                    │
│                                       [Cancel]  [Send invite]      │
└────────────────────────────────────────────────────────────────────┘
```

On send: CompanyInvite row, transactional email with a single-use accept link. Recipient lands on `/employer/invites/[token]` — a public preview page showing **company name · inviter · role they'd hold · personal note** — then a single button **Accept & sign in** that runs through the standard auth flow and lands them on `/employer`.

If the invitee doesn't have an account: the accept page routes through the registration flow first; the CompanyMember row is created on first sign-in after acceptance.

### F. Team comments on the applicant card

When an applicant is expanded in the workspace, a new tab **Team discussion (3)** sits next to **Materials / AI fit / Stage**:

```
┌────────────────────────────────────────────────────────────────────┐
│ Sarah Lin (Manager) · 2h ago                                       │
│ Strong on cell culture, weak on regulatory. Worth a phone screen?  │
│                                                                    │
│   ↳ Marcus Hu (Generalist) · 1h ago                                │
│     Booked one for Thu 2pm. She confirmed.                         │
│                                                                    │
│ Add a comment …                                              [→]   │
└────────────────────────────────────────────────────────────────────┘
```

Comments support a single level of threading (parent → reply). No deeper. Comments emit an activity entry of kind `applicant_commented` so the feed picks them up.

The composer has an `@` trigger that opens a picker scoped to the posting's hiring team (with a "Show all company members" toggle for the edge case where the right person isn't on the team yet). Picked names render as chips in the body and become entries in the comment's `mentions` array; each mention writes a `Notification` row to the targeted user with `reason="mention"`.

### G. The "What's new for you" Overview strip

The brand-stage banner on `/employer` stays for company identity, but a personalised strip sits *under* it (above the action queue) for returning users:

```
┌────────────────────────────────────────────────────────────────────┐
│ Welcome back, Sarah.                                               │
│                                                                    │
│   📣  3 new @mentions                                              │
│   ⚠   2 candidates awaiting your action  (Bioprocess Intern)       │
│   📝  1 scorecard you owe — phone screen w/ Jane, Tuesday          │
│   👋  Marcus Hu joined your team yesterday                         │
│                                                                    │
│ [Open inbox →]                                                     │
└────────────────────────────────────────────────────────────────────┘
```

Fresh / first-time users see an onboarding variant of the same strip ("You're set up. Invite a teammate to start coordinating →").

The strip is powered by `GET /api/employer/inbox` — one cached call per landing.

### H. The sidebar bell + notification inbox

A bell icon in the sidebar header (next to the team chip) shows an unread badge. Clicking opens an inbox drawer:

```
┌────────────────────────────────────────────────────────────────────┐
│ Inbox · 7 unread                              [Mark all read]      │
│                                                                    │
│ ◐ Marcus mentioned you on Jane Doe — Bioprocess Intern · 14m       │
│   "Sarah — can you do the phone screen? She's strong on culture…"  │
│                                                                    │
│ ⚠ New triage on Quality Engineer · 3 candidates · 2h               │
│                                                                    │
│ 📝 Priya submitted a scorecard on Marcus Park · Strong yes · 3h    │
│                                                                    │
│ ─────────── Yesterday ───────────                                  │
│ 👋 Marcus Hu joined the team · Owner approved · 1d                 │
│                                                                    │
│ [Open inbox page →]   [Notification preferences →]                 │
└────────────────────────────────────────────────────────────────────┘
```

Each row links to the relevant surface (candidate, posting, scorecard). "Mark all read" sweeps `readAt = NOW()` on all rows for this user.

### I. Per-posting hiring team chip

On the posting detail header and on each posting row in the workspace:

```
┌────────────────────────────────────────────────────────────────────┐
│ Bioprocess Intern — Toronto                                        │
│ Recruiter ◐ Sarah · Hiring Mgr ◐ Marcus · +2 interviewers   [Edit] │
└────────────────────────────────────────────────────────────────────┘
```

Clicking [Edit] opens a hiring-team drawer:
- Recruiter — single picker (Generalist+)
- Hiring Manager — single picker (Manager+)
- Interviewers / Observers — multi-add

The drawer's "Add interviewer" suggests teammates not yet on this req, ordered by their recent activity on similar postings.

### J. The bulk-action toolbar on the applicant pipeline

When the user multi-selects candidates (checkboxes on each row), a sticky toolbar appears at the bottom:

```
┌────────────────────────────────────────────────────────────────────┐
│ 12 selected  •  [Advance to ▾]  [Reject with template ▾]  [⋯]     │
└────────────────────────────────────────────────────────────────────┘
```

**Reject with template** opens a preview modal showing the first candidate's email rendered with merge variables ("Hi Jane — thank you for applying to **Bioprocess Intern**…"), with a tabbed strip of all 12 candidates so the recruiter can sanity-check each one before sending. Single CTA → bulk send.

### K. Email templates manager (`/employer/templates`)

Manager+ workspace. A list of templates grouped by kind, each row:

```
┌────────────────────────────────────────────────────────────────────┐
│ ✉  Rejection — early stage    [Starter]                            │
│    "Hi {{candidateFirstName}}, thank you for your interest…"       │
│    Last edited by Sarah · 3d ago                                   │
│    [Edit] [Duplicate] [Delete] [Send test to me]                   │
└────────────────────────────────────────────────────────────────────┘
```

The editor is a side-by-side: source on the left (with a merge-variable autocomplete that pops on `{{`), live preview on the right (with the merge variables resolved against a sample candidate).

### L. The scorecard side-by-side view

On an expanded candidate, a new tab **Scorecards (3/4 submitted)** sits next to Team discussion:

```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ Sarah Lin           │ Marcus Hu           │ Priya K.            │
│ Recruiter           │ Hiring Manager      │ Interviewer         │
│ Recommendation:     │ Recommendation:     │ Recommendation:     │
│ ▲ Strong yes        │ ▲ Yes               │ ▼ No                │
│                     │                     │                     │
│ Skills      ▮▮▮▮□   │ Skills      ▮▮▮□□   │ Skills      ▮▮□□□   │
│ Comm        ▮▮▮▮▮   │ Comm        ▮▮▮▮□   │ Comm        ▮▮□□□   │
│ Culture     ▮▮▮▮□   │ Culture     ▮▮▮□□   │ Culture     ▮▮□□□   │
│ Motivation  ▮▮▮▮▮   │ Motivation  ▮▮▮▮□   │ Motivation  ▮▮▮□□   │
│ Overall     ▮▮▮▮□   │ Overall     ▮▮▮□□   │ Overall     ▮▮□□□   │
│                     │                     │                     │
│ "Strong on cell     │ "Solid candidate.   │ "Concerned about    │
│  culture. Phone     │  Some gaps on       │  upstream depth."   │
│  screen confirmed   │  regulatory but     │                     │
│  fit."              │  trainable."        │                     │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

The fourth column is "Awaiting Priya K. (interviewer) · scheduled for Thu" if a scorecard is outstanding. When all required interviewers have submitted, an aggregate banner shows the team's averaged recommendation + a one-click *Advance to offer* / *Reject (template)* shortcut.

---

## Migration story (single-seat → multi-seat)

The migration is the central technical risk. The principles:

1. **Existing single-seat employers keep working through the entire rollout.** They never see a downtime or a forced-config screen.
2. **The migration is idempotent.** Re-running it doesn't double-create rows.
3. **Reversible until the last step.** Until we drop the User-side company columns, we can roll back without data loss.

### Phase 1 — additive schema (one migration)

- Create `Company`, `CompanyMember`, `CompanyInvite`, `EmployerActivityLog`, `ApplicantTeamComment` tables.
- Add `InternshipPosting.companyId`, `InternshipPosting.lastTouched*`, `ApplicationStatus.lastTouched*` columns (nullable).
- Add `presence_pings` table.
- No User-side fields touched.

### Phase 2 — backfill script (`scripts/backfillEmployerCompanies.ts`)

For every User row where `role = "employer"`:
1. Insert a `Company` row populated from the User's company-shaped fields (name, logo, industry, …). Idempotent on `(name, userId)`.
2. Insert a `CompanyMember` row binding the user as `owner` of that Company.
3. For every `InternshipPosting` where `createdById = user.id` and `companyId IS NULL`: set `companyId` to the new Company's id.
4. For every `ApplicationStatus` reachable from those postings: copy `updatedAt → lastTouchedAt` and `updatedById → lastTouchedById` to seed the inline-attribution columns.

Demo accounts get the same treatment; admin/superadmin accounts don't (they're not employers).

### Phase 3 — read-path cutover

Every employer route that today filters by `createdById = userId` switches to:
```ts
const companyIds = await prisma.companyMember
  .findMany({ where: { userId }, select: { companyId: true } });
const where = { companyId: { in: companyIds.map(c => c.companyId) } };
```
With the helper `requireCompanyRole(companyId, "viewer")` enforcing membership on every page-load and mutation.

The User-side company fields (`employerCompany`, `companyLogo`, …) still exist; the read path no longer reads them. The Edit Profile modal on `/employer` rewrites to PATCH `/api/employer/companies/[id]` instead of patching the User.

### Phase 4 — write-path cutover

Every employer mutation (posting create, stage change, comment, offer) writes through:
- The mutation itself
- A `lastTouched*` denormalised update on the relevant row
- An `EmployerActivityLog` insert

All three in a single transaction. A `writeEmployerAction({ kind, companyId, actorId, … })` helper centralises this so we don't sprinkle activity-log writes across N call sites.

### Phase 5 — UI rollout (gated by `team_portal` feature pref)

The team menu, activity feed, team comments, and inline attribution ship behind a feature pref. Owners can flip it on for their company; new companies get it on by default.

Single-seat employers see no UI difference until they flip the pref or invite their first teammate.

### Phase 6 — drop User-side company fields (final, irreversible)

Once every read+write path is on the Company model + the feature pref is on for all employers + a 30-day observation window passes, the User-side `employerCompany`, `companyLogo`, etc. columns get dropped in a final migration.

This is the only irreversible step. Take a snapshot of the DB before it lands.

---

## What this plan does NOT include (future work)

- **Slack-native interactions.** Email + in-app notifications only in v1. Slack channels (accept-from-Slack, comment-from-Slack) come later.
- **Per-feature permission toggles.** Permissions are by role tier only. No "Generalists in this company can send offers" overrides.
- **Pipeline assignment / claiming beyond the recruiter slot.** Each posting has a single named recruiter — that's our v1 "owner of this pipeline." Round-robin auto-assignment, queue rotations, etc. are out of scope.
- **Multi-company posting (cross-posting).** A posting belongs to exactly one company.
- **Audit log export.** The activity feed is browseable; a downloadable audit CSV is a follow-up.
- **External SSO at the company level.** Members sign in through the platform's existing auth.
- **Capacity limits / billing.** A company can have unlimited members in v1. Seat-based pricing is a billing-side problem that doesn't touch the data model.
- **Requisition approval flow.** Postings go live the moment a Manager+ creates them — no Finance / Hiring Manager sign-off step. Real but slow to model; v2.
- **Calendar integration for interviews.** Free-busy lookup against Google / Outlook is v2; v1 keeps the existing proposed-slots flow.
- **Offer letter templating + e-sign.** The Offer model exists today but is bare. Templating + DocuSign-style flow is its own plan.
- **EEO / OFCCP demographic capture.** Sensitive enough to warrant a dedicated plan with legal review.
- **Source-of-hire / funnel reporting.** Needs an analytics layer; v2.

---

## Build sequence (when approved)

Each step is independently shippable. Steps 1–2 unlock the rest; everything after can land in any order, behind the `team_portal` feature pref. Order is chosen so HR teams get *day-1 value* as early as possible — templates + bulk + notifications come before scorecards, because templates save time on every send and scorecards only matter once interviews are happening.

1. **Schema migration** — all new tables (Company, CompanyMember, CompanyInvite, CompanyJoinRequest, EmployerActivityLog, ApplicantTeamComment, PostingTeamMember, EmailTemplate, InterviewScorecard, ScorecardSubmission, Notification, NotificationPreference) + new columns. Reversible.
2. **Backfill script + dry-run** — every existing employer User gets a mirrored Company + an `owner` membership + a default starter set of 4 email templates + 1 starter scorecard. Existing postings get `companyId` + a default `PostingTeamMember` row (creator → recruiter). Idempotent.
3. **`requireCompanyRole` helper + read-path cutover** — replace `createdById` filters with company-scoped filters everywhere. No UI change yet.
4. **Edit Profile modal cutover** — writes through `/api/employer/companies/[id]` instead of the User. Logo / About / brand / industry all move.
5. **`writeEmployerAction` helper + activity-log writes + Notification fan-out** — every existing mutation gets wrapped. Notification rows get created for hiring-team members + Owners (oversight) + @mention targets.
6. **Domain auto-suggest + join-request flow** — signup-form check + `/employer` first-load panel + team panel approve/decline UI. Lower onboarding friction *before* shipping the rest of team UI.
7. **Bulk invite + role-from-title auto-detect** — invite modal accepts paste-a-list, suggests roles inline.
8. **Team panel + sidebar chip + magic-link accept page** — `/employer/team`, sidebar drawer, single-click invite-accept.
9. **Per-posting hiring team chip + editor** — posting detail header, hiring-team drawer, default-on-create.
10. **Notifications: sidebar bell + inbox drawer + per-user prefs** — in-app first.
11. **Notifications: daily digest email job** — cron-driven, idempotent.
12. **Inline attribution chips** — posting rows, applicant cards, action-queue items. Render `lastTouched*` + presence pings.
13. **Activity feed page** — `/employer/activity` with filters and infinite scroll.
14. **Team comments + @mention picker** — new tab on the expanded applicant view, threaded one level deep, `@` picker scoped to the posting's hiring team.
15. **"What's new for you" Overview strip** — `/api/employer/inbox` + personalised digest UI under the brand banner.
16. **Email templates manager** — `/employer/templates` Manager+ workspace; merge-variable autocomplete + live preview; `sendEmployerEmail` single send path.
17. **Bulk action toolbar on the applicant pipeline** — multi-select, advance / reject-with-template / move-to-pool, preview-before-send modal.
18. **Per-posting scorecards** — rubric editor + side-by-side comparison view + "scorecard owed" notifications.
19. **Onboarding tour step + changelog entry** — covers the team menu, invites, attribution chips, mentions, templates, scorecards.
20. **(Later) Drop the User-side company columns** — final migration, after observation.

---

## Risks + open questions

1. **Activity feed cardinality.** A busy company could write hundreds of activity rows a day. The composite index `(companyId, createdAt)` keeps the feed query fast, but we should set a retention policy (e.g. archive entries older than 12 months to cold storage). Not blocking v1.
2. **What about the public job-board side?** Postings carry a `companyName` string used in public listings. After the migration, the public board should read `company.name` instead — there's a small read-path rewrite outside `/employer` to do as part of step 3.
3. **Owner offboarding.** Removing the last Owner is currently blocked. If an Owner leaves without transferring, what happens? Plan: Owner-removal-by-admin path that an internal admin can run from `/admin/employers`. Documented but not exposed to the company UI.
4. **Demo / sandbox employer rollover.** Demo companies expire and get swept; their members are sandbox / phantom users that also get swept on the same cycle. CASCADE deletes handle the chain cleanly.
5. **Invite collision (already-a-member).** If Sarah invites marcus@sanofi.com and Marcus already has a CompanyMember on this company, the invite endpoint short-circuits with a friendly message rather than erroring.
6. **What if a user belongs to 5+ companies?** The sidebar shows the *current* company plus a switcher. The current company persists in the user's session (server-side) so refreshes don't reset it.
7. **Cross-company applicant overlap.** Jane Doe applies to Sanofi *and* Bayer. Both companies see her in their respective workspaces; neither sees the other's comments / stages. The `ApplicationStatus` row is `(postingId, applicantId)`-unique so the segregation is natural — but we should confirm no current code accidentally reads ApplicationStatus across postings without a company filter.
8. **Notification flood on busy companies.** A 50-person hiring team with 200 active candidates could generate thousands of notifications a week. Mitigations: per-reason mute toggles, daily-digest as default (immediate as opt-in), and a hard ceiling of 1 notification per (user × applicant × hour) — repeated stage changes within the same hour coalesce. Reassess after the first month of usage.
9. **Domain auto-suggest false positives.** sarah@gmail.com signing up shouldn't get "We found Gmail Inc.". The domain match runs only against domains where ≥2 verified members share the same domain *and* the domain isn't in a hard-coded ignore list of consumer providers (gmail.com, outlook.com, hotmail.com, …). Owners can also flip a per-company "Disable auto-suggest" switch.
10. **Bulk-send abuse.** A bad actor on a Generalist seat could rage-reject 200 candidates with a hostile templated message. Mitigations: per-seat cap (25/call for Generalists), 100/day rate limit per user, every bulk send writes one activity-log row per recipient *and* a summary row, and the company's Owner gets an immediate (non-digest) notification for any bulk send >50 recipients.
11. **Scorecard rubric drift.** Edit the rubric while submissions exist → existing submissions point at criterion IDs that no longer exist. Mitigations: the rubric editor warns + soft-locks once any submission exists, and the comparison view renders criteria by id with a "(removed)" badge for any orphans.
12. **Starter content getting stale.** The 4 pre-seeded email templates are generic. If we update the wording, existing companies' templates don't update (they're now their own data). Plan: starter templates carry an `isStarter` flag + a `starterVersion`; a one-click "See the latest starter version" diff is available, but we never silently overwrite a company's edits.
