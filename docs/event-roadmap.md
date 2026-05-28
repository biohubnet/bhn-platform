# Event module — Luma-parity roadmap

Comprehensive plan for closing every meaningful gap between the BHN events module
and Luma. Sequenced by ROI + dependency order.

## Phase 1 — Capacity + add-to-calendar (shipped)

Shipped in commit `<latest>` (Dec '26):

- [x] **`BhnEvent.maxAttendees`** (nullable Int) + **`BhnEvent.waitlistEnabled`** (Boolean default true) on the schema, migration `20260729000000_event_capacity_and_waitlist`
- [x] **`Registration.waitlistPosition`** (nullable Int) — set when the registration lands on the waitlist; null otherwise
- [x] New `"waitlist"` value on `Registration.registrationStatus` (existing string column accepts it; no enum change needed)
- [x] **Capacity input + waitlist toggle** on `/admin/events/new`
- [x] **API enforcement**: counts active (pending + confirmed) rows; over-cap registrations land on the waitlist with auto-assigned position; "event full" rejection when waitlist is disabled
- [x] **Auto-promotion** in `cancelRegistration`: when a confirmed/pending seat is cancelled, the lowest waitlistPosition is promoted to confirmed (or pending if event requires approval)
- [x] **Public hero badge**: "X / Y registered" / "N spots left · Almost full" / "Sold out" / "Full · Waitlist open"
- [x] **CTA relabels**: "Register" → "Join the waitlist" when full + waitlist open; "Event full" disabled button when waitlist closed
- [x] **Success page**: waitlist-specific copy + position #N callout
- [x] **Confirmation email**: subject + body adapted for waitlist case (e.g. `Subject: Waitlisted — <title> (position #3)`)
- [x] **Add-to-calendar dropdown** on event hero: Google Calendar / Outlook (web) / Yahoo Calendar URL-only deep links
- [x] **Calendar-link helpers** at `src/lib/events/calendar-links.ts`

## Phase 2 — Email polish + reminders

**Priority**: highest external-visibility upgrades after capacity. Bridges the
"Luma looks like a printed ticket" vs "BHN sends plain text" gap.

- [ ] **HTML branded confirmation email**
  - New `src/lib/email/templates/registration-confirmation.tsx` (or .ts with template literals — keeping it dependency-free, no React-DOM-to-string)
  - Header band with event title + cover image (if set)
  - Status banner — "You're registered" / "Waitlisted #N" / "Pending approval"
  - Event details card (when, where, attendee type)
  - QR code embedded as `<img>` with a `data:image/svg+xml;base64,...` URL — avoids attachment complexity, renders inline in Gmail / Apple Mail
  - CTA button "View your registration" → success page with `?token=`
  - Footer: BHN brand + unsubscribe (Phase 3)
  - Plain-text fallback for accessibility / spam filters
  - Wire into `/api/events/[slug]/register` send + `/api/admin/events/.../resend-email`

- [ ] **`.ics` calendar attachment** in the confirmation email
  - New `src/lib/events/ics.ts` — RFC 5545 builder (VCALENDAR, VEVENT, ORGANIZER, ATTENDEE, UID via event.id + reg.id, DTSTAMP, X-WR-TIMEZONE)
  - Attach via nodemailer's `attachments: [{ filename: "event.ics", content: text, contentType: "text/calendar; method=REQUEST" }]`
  - Also serve the .ics standalone at `/events/<slug>/calendar.ics` for the public "Apple/iCal" calendar download button (added to `AddToCalendar` dropdown)

- [ ] **Timed reminder emails** (1 week / 1 day / 1 hour before)
  - New `EventReminder` model: `(eventId, kind, scheduledAt, sentAt, sentCount)` with `@@unique([eventId, kind])`
  - New cron endpoint `/api/cron/event-reminders` (Vercel cron, fires every 15 min)
  - For each published event with confirmed/pending registrants:
    - Compute the three reminder windows from `event.startDate`
    - Find missing `EventReminder` rows for any due (event, kind) tuple
    - Send appropriate template variant (save-the-date / day-of / starting-soon)
    - Record sent
  - `vercel.json` cron config
  - Three template variants — same chrome, different copy + CTA

## Phase 3 — Host + admin productivity

- [ ] **Custom registration questions per event**
  - Two new models: `CustomRegQuestion` (eventId, key, label, hint, kind = text|longtext|select|multiselect|checkbox, options JSON, required, displayOrder) + `CustomRegAnswer` (registrationId, customRegQuestionId, value)
  - Admin UI at `/admin/events/[slug]/questions` — add / edit / reorder / delete
  - Registration form renders dynamic questions below the standard fields
  - Answers visible on the admin registration detail page
  - CSV export includes answer columns

- [ ] **Bulk email to attendees**
  - `/admin/events/[slug]/messages` compose page
  - Markdown body → HTML via existing markdown renderer
  - Audience picker: "all confirmed" / "waitlisted only" / "checked-in only" / custom registrationId list
  - Sends through existing nodemailer transport, batched (avoid SMTP rate limits)
  - Save sent messages in a new `EventBroadcast` model for audit + retry

- [ ] **Multiple hosts per event**
  - New `EventHost` model: `(eventId, userId, role, displayOrder)` with `@@unique([eventId, userId])`
  - Show hosts on the public event page (small section below "Featured speakers")
  - Hosts receive admin notifications for new registrations (Phase 4)
  - Admin UI on event detail page — add/remove hosts

- [ ] **Cover image upload UI** (replacing the URL input)
  - Use existing upload primitive if BHN has one (check `/api/upload/*`)
  - Otherwise: integrate Vercel Blob — file picker → upload → store URL in `coverImageUrl`
  - Crop UX nice-to-have but URL-only acceptable v1

## Phase 4 — Discovery, recurring, paid

- [ ] **Series / recurring events**
  - New `EventSeries` model: `(slug, title, tagline, description, coverImageUrl)`
  - `BhnEvent.seriesId` nullable FK
  - Public `/events/series/<slug>` page lists all events in the series
  - "Duplicate event" button on admin detail → creates a new event with same workshops/speakers/sponsors but blank dates
  - Optional: scheduled "every X weeks" generator that creates the next N events ahead

- [ ] **Public discovery improvements**
  - Filter chips on `/events` (in-person / online / upcoming / past)
  - Search by title + tagline
  - Per-organizer subscribable page (use EventHost relation): `/events/by/<userSlug>` with all events they're hosting + an RSS / ICS feed

- [ ] **Stripe paid ticketing**
  - New `TicketType` model: `(eventId, name, description, priceCents, currency, capacity, displayOrder)` — supersedes the existing `paymentProvider` columns on Registration for the multi-tier case
  - Stripe Checkout integration — POST a session before showing the form
  - Webhook handler `/api/webhooks/stripe` to confirm payment + create Registration
  - Refund flow from admin detail page
  - Free tier (`priceCents=0`) keeps the existing public-form flow

## Explicitly NOT scoped

- **Native iOS / Android app** — web is the platform. Mobile-web is responsive; native isn't worth the maintenance burden.
- **SMS reminders** — emails cover 95%+ of attendees; revisit if proven attendance gap.
- **Cover video** — overkill for typical BHN events.

## Per-phase implementation order recommendation

If we ship Phase 1 → Phase 2 → Phase 3 → Phase 4 in order, the curve looks like:
- After Phase 1: capacity + waitlist works; basic add-to-calendar shipped (this commit)
- After Phase 2: BHN events feel as professional as Luma for attendees (HTML email, .ics, timed reminders)
- After Phase 3: hosts have the productivity tools they expect (custom questions, bulk email, co-hosts, image upload)
- After Phase 4: recurring/series + paid + discovery brings BHN to feature parity for most use cases

Each phase is independently shippable. Phase 3 has no dependency on Phase 2; if email polish is a higher priority for the team than admin productivity, do Phase 2 alone and skip Phase 3 for now.
