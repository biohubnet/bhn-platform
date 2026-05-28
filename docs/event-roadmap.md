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

## Phase 2 — Email polish + reminders (shipped)

Shipped in commit `<latest>` (Dec '26):

- [x] **HTML branded confirmation email** at `src/lib/email/templates/registration-confirmation.ts` — table-based layout, inline CSS, status banner that adapts to registered / waitlisted / pending, embedded QR code as inline SVG data URL, event details card, CTA, footer. Plain-text fallback preserved.
- [x] **`.ics` calendar attachment** in the confirmation email. Builder at `src/lib/events/ics.ts` (RFC 5545 compliant — UID, DTSTAMP, ORGANIZER, ATTENDEE, line folding at 75 octets, text-escape rules). Attached via nodemailer's `attachments`. Standalone download endpoint at `/events/<slug>/calendar.ics` powers the new "Apple / iCal (.ics)" entry in the AddToCalendar dropdown.
- [x] **Timed reminder emails** (1 week / 1 day / 1 hour before).
  - New `EventReminder` model + migration `20260730000000_event_reminders`
  - Cron endpoint `/api/cron/event-reminders` fires every 15 minutes (see `vercel.json`)
  - Reminder template at `src/lib/email/templates/event-reminder.ts` with three kind-specific variants — "Save the date" / "Tomorrow" / "Starting soon"
  - 30-minute tolerance window so a missed cron firing still catches the next pass; (eventId, kind) unique constraint prevents double-sends
  - Bearer-token auth on the cron endpoint (Vercel cron sets `Authorization: Bearer $CRON_SECRET`)

## Phase 3 — Host + admin productivity (shipped)

Shipped in commit `<latest>` (Dec '26):

- [x] **Custom registration questions per event**
  - Two new models: `CustomRegQuestion` + `CustomRegAnswer` (migration `20260731000000_event_hosts_questions_broadcasts`)
  - Admin CRUD UI at `/admin/events/[slug]/questions` — add / edit / delete with five widget kinds (text / longtext / select / multiselect / checkbox)
  - API endpoints at `POST /api/admin/events/[slug]/questions` + `PATCH/DELETE .../[questionId]`
  - **Public registration form** renders questions dynamically below the standard fields; required questions block submission until answered
  - Server-side validation in the registration API persists answers in the same transaction as the registration
  - Admin link from the event detail page jump-off bar

- [x] **Bulk email to attendees**
  - `/admin/events/[slug]/messages` compose page
  - Markdown body → HTML at send time
  - Audience picker: All / Confirmed / Pending / Waitlist / Checked-in (with live counts)
  - Sends through existing nodemailer transport
  - `EventBroadcast` model records audit: subject, body, audience, recipientCount, sentCount, sentAt, sentBy
  - Past broadcasts listed below the composer

- [x] **Multiple hosts per event**
  - New `EventHost` model: `(eventId, userId, role, displayOrder)` with `@@unique([eventId, userId])`
  - API: `POST /api/admin/events/[slug]/hosts` (lookup user by email) + `DELETE .../[hostId]`
  - Public event page hero shows **"Hosted by N1, N2, N3"** when hosts exist
  - Admin UI for managing hosts deferred to Phase 4 (the API exists; backed by `curl` for now or a Prisma Studio edit)

### Deferred from Phase 3 to Phase 4

- [ ] **Cover image upload UI** — URL input still works fine. Real upload primitive (Vercel Blob) is its own scope; moved.
- [ ] **Host management admin UI** — the EventHost CRUD API ships, but the dedicated /admin/events/[slug]/hosts page didn't. URL-add via the API works in the meantime.

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
