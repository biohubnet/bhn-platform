// 2026 BioHubNet Annual Symposium & Training Week — Communications &
// Marketing Plan. Authored as an "html"-format Script so it renders inside
// the HtmlScriptEditor (Shadow DOM, editable, shareable, version-history)
// exactly like the Molly interview guide. Every section is a `.box` so the
// editor's Sections sidebar can add / move / remove them.
//
// Source material distilled into this plan:
//   • 2026 Symposium Planning doc (Thu Oct 29 2026; longer breaks; Panels
//     1–3; ENGAGE / EXPERIENCE / EQUIP tracks; AI-in-the-Workplace panel;
//     speed networking; keynote candidates; Chelsea Hotel; Luma tiered
//     ticketing; revised sponsorship package; new microsite + videographer
//     + live social).
//   • 2025 Marketing & Communications Timeline (the 10-week cadence:
//     Save-the-Date → Registration Open → Early Engagement → Merch/print/
//     filming → Final Countdown → Event Day → Thank-You → Legacy/Reporting).
//   • 2025 LinkedIn cadence (training-week teasers, tour spotlights, live
//     on-the-day posts, wrap post, report launch) + the 2025 results
//     (270+ symposium attendees, 130+ HQP, 5 workshops, 2 CDMO tours).

export const SYMPOSIUM_CSS = `:root {
      --ink: #1f2428;
      --muted: #626b73;
      --line: #d9ddd8;
      --soft: #f5f7f2;
      --panel: #ffffff;
      --green: #2f5d50;
      --green-soft: #e7f0eb;
      --gold: #b88a2d;
      --gold-soft: #f6edd8;
      --blue: #2b5f86;
      --blue-soft: #e3eef6;
      --rose: #9f4a54;
      --rose-soft: #f6e4e6;
      --plum: #6a4a86;
      --plum-soft: #ece3f4;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #fbfbf7;
      color: var(--ink);
      font-family: Verdana, Geneva, sans-serif;
      font-size: 15px;
      line-height: 1.5;
    }

    main {
      width: min(1060px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 36px 0 64px;
    }

    header {
      border-bottom: 4px solid var(--green);
      padding-bottom: 20px;
      margin-bottom: 22px;
    }

    .label {
      color: var(--green);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1, h2, h3, h4 {
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.14;
      letter-spacing: 0;
    }

    h1 {
      margin: 8px 0 8px;
      font-size: clamp(2rem, 4.4vw, 3.2rem);
      font-weight: 700;
    }

    .intro {
      max-width: 820px;
      margin: 0;
      color: var(--muted);
      font-size: 1.02rem;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel);
      padding: 6px 13px;
      font-size: 0.82rem;
      font-weight: 600;
    }
    .chip .k { color: var(--green); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.7rem; }

    .box {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      padding: 22px 24px;
      margin-bottom: 18px;
    }
    .box > h2 {
      margin: 0 0 4px;
      font-size: 1.55rem;
    }
    .box > .sub {
      margin: 0 0 16px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .box.accent { background: var(--green-soft); border-color: #c9ded4; }

    .eyebrow {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 6px;
    }

    /* ── KPI / snapshot cards ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .kpi {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--soft);
      padding: 14px 16px;
    }
    .kpi .n { font-family: Georgia, serif; font-size: 1.9rem; font-weight: 700; color: var(--green); line-height: 1; }
    .kpi .t { font-size: 0.78rem; color: var(--muted); margin-top: 6px; }

    /* ── Gantt chart ── */
    .gantt-scroll { overflow-x: auto; padding-bottom: 6px; }
    .gantt {
      min-width: 1180px;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      font-size: 0.72rem;
    }
    .gantt-head, .gantt-row {
      display: grid;
      grid-template-columns: 190px repeat(17, 1fr);
    }
    .gantt-head {
      background: var(--green);
      color: #fff;
      font-weight: 700;
    }
    .gantt-head > div {
      padding: 7px 4px;
      text-align: center;
      border-left: 1px solid rgba(255,255,255,0.18);
    }
    .gantt-head > div:first-child {
      text-align: left;
      padding-left: 12px;
      border-left: none;
    }
    .gantt-head .mon { font-size: 0.62rem; opacity: 0.8; font-weight: 600; }
    .gantt-row { border-top: 1px solid var(--line); }
    .gantt-row:nth-child(even) { background: var(--soft); }
    .gantt-label {
      padding: 9px 10px 9px 12px;
      font-weight: 600;
      border-right: 1px solid var(--line);
      display: flex;
      align-items: center;
    }
    .gantt-track {
      grid-column: 2 / -1;
      display: grid;
      grid-template-columns: repeat(17, 1fr);
      align-items: center;
      position: relative;
    }
    /* July runway (first 3 columns) — faint tint so the "optional early
       start" zone reads as distinct from the live Aug→Nov campaign. */
    .gantt-track > .cell:nth-child(-n+3) { background: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.025) 5px, rgba(0,0,0,0.025) 10px); }
    .gantt-head > div:nth-child(2), .gantt-head > div:nth-child(3), .gantt-head > div:nth-child(4) { opacity: 0.82; }
    /* Draggable hint bubble (sits in the first row's empty space). */
    .drag-hint {
      grid-row: 1;
      align-self: center;
      justify-self: start;
      background: var(--gold-soft);
      color: #6b4e14;
      border: 1px solid var(--gold);
      font-size: 0.62rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(184, 138, 45, 0.25);
      animation: dragHintPulse 1.9s ease-in-out infinite;
    }
    @keyframes dragHintPulse {
      0%, 100% { transform: translateX(0); opacity: 0.9; }
      50% { transform: translateX(4px); opacity: 1; }
    }
    .gantt-track > .cell {
      border-left: 1px solid var(--line);
      height: 100%;
      min-height: 30px;
    }
    .bar {
      grid-row: 1;
      min-height: 16px;
      border-radius: 4px;
      align-self: center;
      margin: 3px 2px;
      padding: 2px 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #fff;
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1.25;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .bar.g  { background: var(--green); }
    .bar.gd { background: var(--gold); }
    .bar.bl { background: var(--blue); }
    .bar.rs { background: var(--rose); }
    .bar.pl { background: var(--plum); }
    .bar.event { background: #b3261e; }
    .gantt-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 12px;
      font-size: 0.76rem;
      color: var(--muted);
    }
    .gantt-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .swatch { width: 13px; height: 13px; border-radius: 3px; display: inline-block; }

    /* ── generic tables ── */
    table.grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.86rem;
      margin: 4px 0 2px;
    }
    table.grid th, table.grid td {
      border: 1px solid var(--line);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    table.grid th {
      background: var(--green-soft);
      font-family: Georgia, serif;
      font-weight: 700;
      font-size: 0.82rem;
    }
    table.grid td .when { font-weight: 700; color: var(--green); }

    /* ── channel / phase cards ── */
    .cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 16px;
      background: var(--soft);
    }
    .card h4 { margin: 0 0 8px; font-size: 1.02rem; }
    .card ul { margin: 0; padding-left: 18px; }
    .card li { margin: 3px 0; }

    ul.checklist { list-style: none; padding-left: 0; margin: 6px 0; }
    ul.checklist li {
      position: relative;
      padding-left: 26px;
      margin: 5px 0;
      line-height: 1.45;
    }
    ul.checklist li::before {
      content: "";
      position: absolute;
      left: 0; top: 2px;
      width: 15px; height: 15px;
      border: 1.5px solid var(--green);
      border-radius: 4px;
      background: var(--panel);
    }
    ul.checklist li.done::before {
      background: var(--green);
    }
    ul.checklist li .owner {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--gold);
      margin-left: 6px;
    }

    .post-title {
      font-weight: 700;
      color: var(--green);
    }
    blockquote.sample {
      border-left: 3px solid var(--gold);
      background: var(--gold-soft);
      margin: 10px 0;
      padding: 12px 16px;
      border-radius: 0 6px 6px 0;
      font-size: 0.9rem;
    }
    .tier-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .tier {
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: var(--panel);
    }
    .tier .head { padding: 12px 14px; color: #fff; }
    .tier .head .price { font-family: Georgia, serif; font-size: 1.4rem; font-weight: 700; }
    .tier .head .name { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.92; }
    .tier ul { margin: 0; padding: 12px 14px 14px 30px; font-size: 0.82rem; }
    .tier li { margin: 5px 0; }
    .tier.t1 .head { background: #4a3d6b; }
    .tier.t2 .head { background: var(--green); }
    .tier.t3 .head { background: var(--blue); }
    .tier.t4 .head { background: var(--gold); }

    .callout {
      border: 1px dashed var(--gold);
      background: var(--gold-soft);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 0.88rem;
    }
    .two-col-notes { columns: 2; column-gap: 26px; }

    @media (max-width: 720px) {
      .kpi-grid, .tier-grid { grid-template-columns: 1fr 1fr; }
      .cols-2, .two-col-notes { grid-template-columns: 1fr; columns: 1; }
    }`;

// Bump PLAN_VERSION (here and in the <main data-plan-version> below) to
// re-heal every seeded plan to this pristine HTML on next load — used to
// push a corrected baseline. Docs already carrying the current marker are
// left untouched, so real team edits are never overwritten.
export const PLAN_VERSION = "4";

// Gridline cells for one 17-column Gantt row (Jul 13 → Nov 2). Built once
// and reused per row to keep the markup readable.
const GANTT_CELLS = Array.from({ length: 17 }, (_, i) => `<div class="cell" style="grid-column:${i + 1}"></div>`).join("");

export const SYMPOSIUM_HTML = `<main data-plan-version="4">
  <header>
    <span class="label">BioHubNet · Marketing &amp; Communications</span>
    <h1>2026 Annual Symposium &amp; Training Week — Communications Plan</h1>
    <p class="intro">The end-to-end promotion, sponsorship, live-day and post-event playbook for the 2nd BioHubNet Annual Symposium and Training Week. Built on last year's 10-week marketing timeline and refreshed for the 2026 format. Everything here is editable — drag sections in the sidebar, edit any cell, and share a link with the team.</p>
    <div class="meta-row">
      <span class="chip"><span class="k">Symposium</span> Thu, Oct 29 2026</span>
      <span class="chip"><span class="k">Training Week</span> Oct 26–29 2026</span>
      <span class="chip"><span class="k">Venue</span> Chelsea Hotel, Toronto</span>
      <span class="chip"><span class="k">Tickets</span> Luma · tiered ($20/HQP)</span>
      <span class="chip"><span class="k">Owner</span> BHN Marketing</span>
    </div>
  </header>

  <section>
  <article class="box accent" data-sid="snapshot">
    <span class="eyebrow">At a glance</span>
    <h2>Snapshot &amp; targets</h2>
    <p class="sub">2025 results are the baseline. 2026 targets assume a broader national push (multi-hub segment) and an earlier sponsorship drive.</p>
    <div class="kpi-grid">
      <div class="kpi"><div class="n">300+</div><div class="t">Symposium attendees (2025: 270+)</div></div>
      <div class="kpi"><div class="n">150+</div><div class="t">Training Week HQP (2025: 130+)</div></div>
      <div class="kpi"><div class="n">6–8</div><div class="t">Confirmed sponsors / partners</div></div>
      <div class="kpi"><div class="n">2,500+</div><div class="t">LinkedIn followers (2025: ~2,033)</div></div>
    </div>
    <p style="margin:16px 0 0;font-size:0.9rem;color:var(--muted);">
      <strong>What changed for 2026:</strong> event moves to <strong>Thursday, Oct 29</strong>; longer networking breaks (30–40 min); pitch competition and reception pulled earlier (≈4–6 PM); three panels including a new <strong>“AI in the Workplace”</strong> panel; ENGAGE / EXPERIENCE / EQUIP session tracks; structured speed-networking with industry professionals; a National Hub Collaboration segment; a <strong>new microsite</strong>, refreshed sponsorship package, dedicated <strong>videographer</strong>, and live-social coverage (Otter.ai capture).
    </p>
  </article>

  <!-- ══════════════════ GANTT ══════════════════ -->
  <article class="box" data-sid="gantt">
    <span class="eyebrow">Master timeline</span>
    <h2>Communications Gantt chart</h2>
    <p class="sub">17-week runway, Jul 13 &rarr; event &rarr; Nov 2. Bars are colour-coded by workstream. <strong>Drag a bar to reschedule it</strong>, or drag either end to change its start or finish &mdash; the week columns are the header dates. The three hatched columns before Aug 3 are optional early runway: drag a bar left to start sooner. (Add, reorder, or remove rows from the Tables panel on the right.)</p>
    <div class="gantt-scroll">
      <div class="gantt">
        <div class="gantt-head">
          <div>Workstream</div>
          <div>Jul<span class="mon">13</span></div>
          <div>Jul<span class="mon">20</span></div>
          <div>Jul<span class="mon">27</span></div>
          <div>Aug<span class="mon">3</span></div>
          <div>Aug<span class="mon">10</span></div>
          <div>Aug<span class="mon">17</span></div>
          <div>Aug<span class="mon">24</span></div>
          <div>Aug<span class="mon">31</span></div>
          <div>Sep<span class="mon">7</span></div>
          <div>Sep<span class="mon">14</span></div>
          <div>Sep<span class="mon">21</span></div>
          <div>Sep<span class="mon">28</span></div>
          <div>Oct<span class="mon">5</span></div>
          <div>Oct<span class="mon">12</span></div>
          <div>Oct<span class="mon">19</span></div>
          <div>Oct<span class="mon">26</span></div>
          <div>Nov<span class="mon">2</span></div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Foundation &amp; Save-the-Date</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar g" style="grid-column:4 / 7">Save-the-Date</div>
            <div class="drag-hint" style="grid-column:8 / 15">&harr; Tip: drag a bar or its ends to change dates</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Microsite / landing page build</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar bl" style="grid-column:4 / 9">Build &amp; go-live</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Sponsorship drive</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar gd" style="grid-column:3 / 12">Outreach &rarr; print cutoff (Sep 21)</div>
            <div class="bar gd" style="grid-column:12 / 16">digital sponsors</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Registration open (Luma)</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar g" style="grid-column:7 / 18">Open &rarr; close registration</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Content &amp; video filming</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar pl" style="grid-column:8 / 15">Promo + HQP testimonial videos</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Speaker / session spotlights</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar bl" style="grid-column:9 / 16">Keynote + panellist reveals</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Early engagement push (email/social)</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar gd" style="grid-column:10 / 16">Emails &middot; carousels &middot; reels</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Workshop &amp; tour teasers</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar pl" style="grid-column:12 / 16">CDMO tours &middot; CL3 &middot; bootcamp</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Final countdown campaign</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar rs" style="grid-column:14 / 17">Logistics &middot; reminders &middot; hype</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Training Week + Symposium (LIVE)</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar event" style="grid-column:16 / 17">Oct 26&ndash;29 &middot; LIVE</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Post-event: thank-you &amp; recap</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar g" style="grid-column:16 / 18">Wrap &middot; gallery &middot; survey</div>
          </div>
        </div>

        <div class="gantt-row">
          <div class="gantt-label">Report &amp; sponsor wrap</div>
          <div class="gantt-track">${GANTT_CELLS}
            <div class="bar gd" style="grid-column:17 / 18">Report + sponsor deck</div>
          </div>
        </div>
      </div>
    </div>
    <div class="gantt-legend">
      <span><span class="swatch" style="background:var(--green)"></span> Core / registration</span>
      <span><span class="swatch" style="background:var(--gold)"></span> Sponsorship &amp; engagement</span>
      <span><span class="swatch" style="background:var(--blue)"></span> Web &amp; speakers</span>
      <span><span class="swatch" style="background:var(--plum)"></span> Content / video</span>
      <span><span class="swatch" style="background:var(--rose)"></span> Final countdown</span>
      <span><span class="swatch" style="background:#b3261e"></span> Live event</span>
    </div>
    <div class="callout" style="margin-top:14px">
      <strong>Timeline dependencies to respect (sanity-check before locking dates):</strong>
      <ul style="margin:8px 0 0;padding-left:18px;">
        <li><strong>Sponsor logos for print/merch must lock ~6 weeks out (by ~Sep 21)</strong> &mdash; posters, signage, wayfinding and merch need 4&ndash;6 wks production. A later <em>digital</em> cutoff (~1 wk before) still gets a sponsor onto the microsite, slide loop and email footer.</li>
        <li><strong>Merch/print order placed by mid-Sep</strong> (same 4&ndash;6 wk lead) &mdash; so it can't wait on late sponsor confirmations.</li>
        <li><strong>Registration closes ~Oct 22 (1 wk out)</strong> to lock catering + badge headcount with the Chelsea Hotel.</li>
        <li><strong>Keynote + panellists confirmed before the Speaker Spotlight series</strong> starts (early Sep) &mdash; the reveals are the engagement engine.</li>
        <li><strong>Impact Report is realistically ~6&ndash;8 weeks post-event</strong> (last year's took ~3 months); publish the highlight reel + recap first to hold momentum.</li>
      </ul>
    </div>
  </article>

  <!-- ══════════════════ PRE-EVENT ══════════════════ -->
  <article class="box" data-sid="pre-event">
    <span class="eyebrow">Phase 1</span>
    <h2>Pre-event promotion plan</h2>
    <p class="sub">A five-stage cadence mirroring the 2025 timeline. Each stage names its trigger, channels, and hero deliverable.</p>
    <table class="grid">
      <thead>
        <tr><th style="width:150px">Stage &amp; window</th><th>Milestone &amp; goal</th><th>Deliverables &amp; channels</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="when">Save-the-Date</span><br>Aug 3–17 (Wk 1–3)</td>
          <td>Lock the date in calendars before summer ends; internal registration deadline set.</td>
          <td>Email blast #1 · LinkedIn "Save the Date" post · website bio-link update · microsite skeleton live with preliminary agenda.</td>
        </tr>
        <tr>
          <td><span class="when">Registration Open</span><br>Aug 24 – Sep 7 (Wk 4–6)</td>
          <td>Landing page + Luma go live with preliminary agenda and tiered tickets; first promo post.</td>
          <td>Microsite live · Luma event page ($20/HQP; tiered eligible vs. ineligible HQP + industry) · poster/flyer distribution to 14 partner campuses · social carousel.</td>
        </tr>
        <tr>
          <td><span class="when">Early Engagement</span><br>Sep 7 – Oct 5 (Wk 6–10)</td>
          <td>Build momentum on programming; start speaker/session reveals; open sponsorship visibility.</td>
          <td>Email #2 (program themes) · Speaker Spotlight series (keynote + Panels 1–3) · <strong>Sponsor Spotlight posts</strong> (welcome each sponsor as they close) · workshop &amp; agenda PDF · "Why attend" reel · sponsor logos added to microsite + email footer as they close.</td>
        </tr>
        <tr>
          <td><span class="when">Workshop &amp; Tour Teasers</span><br>Sep 28 – Oct 19 (Wk 9–12)</td>
          <td>Sell Training Week individually — each workshop / CDMO tour / CL3 tour gets its own spotlight.</td>
          <td>One post per session (OBIO bootcamp, CATTI cell manufacturing, BioZone bioreactor, CL3/THCF tour, OmniaBio &amp; Eurofins CDMO tours) · registration deadline reminders.</td>
        </tr>
        <tr>
          <td><span class="when">Final Countdown</span><br>Oct 15–26 (2 wks out)</td>
          <td>Convert fence-sitters; equip confirmed attendees with logistics; registration closes ~Oct 22 for headcount.</td>
          <td>"2 weeks to go" + sponsor thank-you post · attendee info email (location, transit, agenda) · "Getting There" social · registration-closing notice (~Oct 22) · day-before hype post tagging speakers/partners &amp; sponsors.</td>
        </tr>
      </tbody>
    </table>
    <div class="cols-2" style="margin-top:16px">
      <div class="card">
        <h4>Channels &amp; assets</h4>
        <ul>
          <li><strong>LinkedIn</strong> — primary. Company page (@BioHubNet) + team reshares.</li>
          <li><strong>Email</strong> — BHN newsletter list + partner-institution distribution.</li>
          <li><strong>Microsite</strong> — biohubnet.ca/2026-annual-symposium (agenda, speakers, register).</li>
          <li><strong>Print</strong> — flyer + poster to 14 partner campuses, labs, innovation hubs.</li>
          <li><strong>Partners</strong> — co-promotion by OBIO, CATTI, OmniaBio, Eurofins, EPIC/EPIQ, PRiME, hub network.</li>
        </ul>
      </div>
      <div class="card">
        <h4>Content to produce early</h4>
        <ul>
          <li>Refreshed event key visual + flyer + signage/wayfinding.</li>
          <li>Registration promo video (why register, challenges we solve).</li>
          <li>HQP testimonial videos (played between sessions on the day).</li>
          <li>Speaker Spotlight + <strong>Sponsor Spotlight</strong> card templates.</li>
          <li>Sponsor logo lockups (tiered) for microsite, slide loop, email footer &amp; signage.</li>
          <li>Merch/print order — allow 4–6 wks production; pillar stickers. <em>Lock sponsor logos before this goes to print (~Sep 21).</em></li>
        </ul>
      </div>
    </div>
  </article>

  <!-- ══════════════════ DURING / ON-THE-DAY ══════════════════ -->
  <article class="box" data-sid="on-the-day">
    <span class="eyebrow">Phase 2</span>
    <h2>During-event &amp; on-the-day plan</h2>
    <p class="sub">Training Week runs Oct 26–29; Symposium Day is Thu Oct 29. Goal: real-time storytelling that makes non-attendees feel the room and feeds the post-event recap.</p>
    <table class="grid">
      <thead>
        <tr><th style="width:170px">Moment</th><th>Live action</th><th>Owner</th></tr>
      </thead>
      <tbody>
        <tr><td><span class="when">Training Week Day 1</span><br>Mon Oct 26</td><td>"Training Week is underway" kickoff post; bootcamp Day-1 photo post; Stories from workshops.</td><td>Social lead</td></tr>
        <tr><td><span class="when">Training Week Days 2–3</span><br>Oct 27–28</td><td>Per-session posts as they happen: bioreactor workshop, CL3 tour, cell-manufacturing bootcamp. Tag partners + participants.</td><td>Social lead + floater</td></tr>
        <tr><td><span class="when">CDMO tour day</span><br>Wed Oct 28</td><td>OmniaBio + Eurofins CDMO Alphora tour posts; short reels from the floor.</td><td>Videographer</td></tr>
        <tr><td><span class="when">Symposium AM</span><br>Thu Oct 29</td><td>"We're live" + Welcome Remarks post; keynote quote card; Panel 1 &amp; 2 highlights; exhibitor booth Stories.</td><td>Social lead</td></tr>
        <tr><td><span class="when">Symposium PM</span><br>Thu Oct 29</td><td>Speed-networking + breakout highlights; AI-in-the-Workplace panel; VentureLift showcase; pitch competition; reception.</td><td>Social + videographer</td></tr>
        <tr><td><span class="when">Wrap (same night)</span><br>Thu Oct 29</td><td>"That's a wrap" thank-you post tagging speakers, judges, partners, sponsors; #BioHubNet26.</td><td>Marketing lead</td></tr>
      </tbody>
    </table>
    <div class="cols-2" style="margin-top:16px">
      <div class="card">
        <h4>On-the-day toolkit</h4>
        <ul>
          <li>Run-of-show doc with the exact post per agenda slot (pre-drafted captions).</li>
          <li>Pre-made quote-card &amp; "Now on stage" templates (fill photo + name).</li>
          <li>Live-caption capture via <strong>Otter.ai</strong> for pull-quotes.</li>
          <li>Dedicated <strong>videographer</strong> for B-roll, reels, attendee interviews.</li>
          <li>Event hashtag locked: <strong>#BioHubNet26</strong> / #BHNSymposium.</li>
          <li>Photographer shot-list (keynote, panels, networking, booths, pitch).</li>
        </ul>
      </div>
      <div class="card">
        <h4>Roles on the day</h4>
        <ul>
          <li><strong>Social lead</strong> — posts to LinkedIn in real time from run-of-show.</li>
          <li><strong>Floater</strong> — captures Stories/photos, feeds the social lead.</li>
          <li><strong>Videographer</strong> — reels + interviews + highlight footage.</li>
          <li><strong>Registration desk</strong> — check-in, name badges, wayfinding.</li>
          <li><strong>MC / stage</strong> — cues housekeeping + "tag us" reminders to the room.</li>
        </ul>
      </div>
    </div>
    <blockquote class="sample">
      <span class="post-title">Sample live post — Welcome Remarks</span><br>
      🕘 9:00 AM | Welcome Remarks — We're officially live at the BioHubNet 2026 Annual Symposium! Thank you to everyone joining us. We began with inspiring welcome remarks from [Speaker], [Title], University of Toronto. #BioHubNet26
    </blockquote>
  </article>

  <!-- ══════════════════ POST-EVENT ══════════════════ -->
  <article class="box" data-sid="post-event">
    <span class="eyebrow">Phase 3</span>
    <h2>Post-event plan</h2>
    <p class="sub">Close the loop: thank the community, publish proof, convert momentum into next year's pipeline and sponsor renewals.</p>
    <table class="grid">
      <thead>
        <tr><th style="width:150px">When</th><th>Action</th><th>Deliverable</th></tr>
      </thead>
      <tbody>
        <tr><td><span class="when">Day 0–1</span><br>Oct 29–30</td><td>"Thank-you" push while the event is fresh.</td><td>Wrap post + website recap gallery link + post-event survey to all attendees.</td></tr>
        <tr><td><span class="when">Week 1</span><br>by Nov 2</td><td>Publish the highlight reel + reshare best attendee/partner posts.</td><td>1–2 min highlight video · curated repost of community reflections.</td></tr>
        <tr><td><span class="when">Weeks 2–4</span><br>Nov</td><td>Legacy content + reporting; sponsor fulfilment recap.</td><td>Post-event article · full-audio/session recordings uploaded · sponsor thank-you deck with delivered impressions.</td></tr>
        <tr><td><span class="when">Weeks 4–6</span><br>Nov–Dec</td><td>Flagship report launch (the biggest post-event asset).</td><td><strong>2026 Annual Symposium &amp; Training Week Report</strong> — metrics, themes, testimonials — announced on LinkedIn + emailed to the list.</td></tr>
      </tbody>
    </table>
    <div class="callout" style="margin-top:14px">
      <strong>Success metric to capture:</strong> reuse the 2025 report framing — total attendees, HQP trained, workshops + site visits delivered, ecosystem themes surfaced (AI &amp; data readiness, commercialization pathways, workforce priorities). These become the headline numbers in both the report and next year's sponsorship deck.
    </div>
  </article>

  <!-- ══════════════════ SPONSORSHIP ══════════════════ -->
  <article class="box" data-sid="sponsorship">
    <span class="eyebrow">Revenue</span>
    <h2>Sponsorship plan &amp; revised 2026 package</h2>
    <p class="sub">Start outreach in Week 1 (Aug) — sponsors need lead time and their logos should ride the whole campaign. Below is a proposed tiered package refreshed from the 2025 PDF.</p>

    <h3 style="margin:6px 0 10px;font-size:1.1rem">Proposed 2026 tiers</h3>
    <div class="tier-grid">
      <div class="tier t1">
        <div class="head"><div class="price">$10,000</div><div class="name">Presenting · Title</div></div>
        <ul>
          <li>“Presented by” lockup on all event branding</li>
          <li>Keynote or plenary intro (2 min)</li>
          <li>Premium booth + logo on stage screens</li>
          <li>4 passes + reserved networking table</li>
          <li>Logo on report cover + dedicated post</li>
        </ul>
      </div>
      <div class="tier t2">
        <div class="head"><div class="price">$5,000</div><div class="name">Gold · Track</div></div>
        <ul>
          <li>Named session / panel or track sponsor</li>
          <li>Standard exhibitor booth</li>
          <li>Logo on microsite + signage + emails</li>
          <li>2 passes</li>
          <li>Shared sponsor thank-you post</li>
        </ul>
      </div>
      <div class="tier t3">
        <div class="head"><div class="price">$2,500</div><div class="name">Silver · Exhibitor</div></div>
        <ul>
          <li>Exhibitor booth in networking hall</li>
          <li>Logo on microsite + slide loop</li>
          <li>1 pass</li>
          <li>Group recognition post</li>
        </ul>
      </div>
      <div class="tier t4">
        <div class="head"><div class="price">In-kind</div><div class="name">Community · Partner</div></div>
        <ul>
          <li>Host a workshop / CDMO tour / venue / AV</li>
          <li>Logo as "Training Week Partner"</li>
          <li>Named in wrap + report partner list</li>
          <li>Co-promotion to their network</li>
        </ul>
      </div>
    </div>

    <h3 style="margin:20px 0 8px;font-size:1.1rem">What to revise in the package PDF this year</h3>
    <ul class="checklist">
      <li>Update headline metrics to 2025 actuals (<strong>270+ attendees, 130+ HQP, 5 workshops, 2 CDMO tours</strong>) as social proof.</li>
      <li>Add the new <strong>tiered table</strong> above (2025 package was mostly custom/contact-us — give sponsors clear entry points).</li>
      <li>Add an <strong>audience snapshot</strong> — institutions, roles (grad/postdoc/RA), industry attendees, national hub reach.</li>
      <li>Add a <strong>digital deliverables</strong> line: logo on microsite, slide loop, email footer, and delivered LinkedIn impressions.</li>
      <li>Refresh the visual to the 2026 key visual; keep a one-page "at a glance" tier comparison up front.</li>
      <li>Include the post-event <strong>sponsor thank-you deck</strong> as a named deliverable (proof of ROI → renewal).</li>
      <li>State a <strong>two-stage deadline</strong>: a <strong>print cutoff (~Sep 21)</strong> so logos make posters / signage / merch (4–6 wk production), and a later <strong>digital cutoff (~1 wk out)</strong> for the microsite, slide loop &amp; email footer. (Confirming "by early Oct" is too late for anything printed.)</li>
    </ul>

    <h3 style="margin:20px 0 8px;font-size:1.1rem">Sponsor visibility — every touchpoint to sell</h3>
    <p class="sub" style="margin-bottom:12px">Map each tier to concrete, repeatable placements across the whole campaign — this is what makes the package easy to say yes to and easy to renew.</p>
    <div class="cols-2">
      <div class="card">
        <h4>Before the event</h4>
        <ul>
          <li><strong>Microsite</strong> — tiered logo wall + "Presented by" lockup in the footer of every page.</li>
          <li><strong>Email</strong> — sponsor logo strip in the footer of each blast (Save-the-Date → reminders).</li>
          <li><strong>Print</strong> — logos on posters, flyers, signage &amp; wayfinding (needs the Sep 21 cutoff).</li>
          <li><strong>Social</strong> — a "Welcome our sponsors" announcement post + a dedicated <strong>Sponsor Spotlight</strong> beat in the reveal series.</li>
          <li><strong>Registration</strong> — sponsor mention in the Luma event page + confirmation email.</li>
        </ul>
      </div>
      <div class="card">
        <h4>On the day &amp; after</h4>
        <ul>
          <li><strong>Slide loop</strong> — rotating sponsor logos on the screens between sessions.</li>
          <li><strong>Naming</strong> — sponsored session / panel / networking break or coffee; "reception sponsored by…".</li>
          <li><strong>Booths + banners</strong> — exhibitor tables in the networking hall; banner at the registration desk.</li>
          <li><strong>Verbal</strong> — MC shout-outs from stage at open/close; thank-you in the wrap post (tagged).</li>
          <li><strong>Post-event</strong> — logo wall + recognition in the Impact Report; a sponsor thank-you deck with <em>delivered impressions per tier</em>.</li>
        </ul>
      </div>
    </div>

    <div class="callout" style="margin-top:14px">
      <strong>2025 sponsorship CTA to reuse &amp; strengthen:</strong> “By partnering with us as a sponsor, your organization will gain visibility among key stakeholders while supporting knowledge exchange and workforce development in this rapidly growing field.” Pair it with the tier table and a single <em>“Confirm your tier by [date]”</em> ask.
    </div>
  </article>

  <!-- ══════════════════ SAMPLE REPORT ══════════════════ -->
  <article class="box" data-sid="sample-report">
    <span class="eyebrow">Deliverable template</span>
    <h2>Sample post-event report</h2>
    <p class="sub">Skeleton for the flagship report launched 4–6 weeks after the event. Fill the brackets with 2026 numbers. Mirrors the structure of the 2025 Annual Symposium &amp; Training Week Report.</p>

    <h3 style="margin:4px 0 6px;font-size:1.15rem">2026 Annual Symposium &amp; Training Week — Impact Report</h3>
    <p style="margin:0 0 12px;color:var(--muted);font-size:0.9rem">Leslie Dan Faculty of Pharmacy, University of Toronto · Chelsea Hotel, Toronto · Oct 26–29, 2026</p>

    <div class="kpi-grid" style="margin-bottom:14px">
      <div class="kpi"><div class="n">[###]</div><div class="t">Symposium attendees</div></div>
      <div class="kpi"><div class="n">[###]</div><div class="t">HQP trained in Training Week</div></div>
      <div class="kpi"><div class="n">[#]</div><div class="t">Workshops + CDMO tours</div></div>
      <div class="kpi"><div class="n">[###k]</div><div class="t">LinkedIn impressions</div></div>
    </div>

    <table class="grid">
      <thead><tr><th style="width:210px">Section</th><th>What goes here</th></tr></thead>
      <tbody>
        <tr><td><span class="when">1 · Executive summary</span></td><td>One paragraph: what the event was, who came, the headline outcome.</td></tr>
        <tr><td><span class="when">2 · By the numbers</span></td><td>Attendance, HQP, sessions, sponsors, reach, satisfaction (survey NPS).</td></tr>
        <tr><td><span class="when">3 · Program highlights</span></td><td>Keynote, Panels 1–3 (incl. AI in the Workplace), speed networking, breakouts, VentureLift showcase, pitch competition.</td></tr>
        <tr><td><span class="when">4 · Training Week</span></td><td>Each workshop + CDMO/CL3 tour: partner, participants, skills gained.</td></tr>
        <tr><td><span class="when">5 · Ecosystem themes</span></td><td>What surfaced — AI &amp; data readiness, commercialization pathways, workforce priorities, national-hub collaboration.</td></tr>
        <tr><td><span class="when">6 · Voices</span></td><td>2–3 attendee/partner testimonial quotes + a standout LinkedIn reflection.</td></tr>
        <tr><td><span class="when">7 · Sponsors &amp; partners</span></td><td>Logo wall + thank-you; delivered impressions per tier.</td></tr>
        <tr><td><span class="when">8 · What's next</span></td><td>Opportunities identified + a teaser for 2027.</td></tr>
      </tbody>
    </table>
    <blockquote class="sample" style="margin-top:14px">
      <span class="post-title">Sample report-launch post</span><br>
      📘 BioHubNet's 2026 Annual Symposium &amp; Training Week Report is now live, capturing key insights on what's next for Canada's biomanufacturing workforce development. More than [###] attendees joined the Symposium, featuring industry panels, an AI-in-the-Workplace discussion, professional-development workshops, a pitch competition, and the VentureLift showcase. During Training Week, [###]+ HQP took part in [#] hands-on workshops and [#] CDMO site visits. Read the report: [link] #BioHubNet #TrainingWeek #WorkforceDevelopment
    </blockquote>
  </article>

  <!-- ══════════════════ TASK BREAKDOWN ══════════════════ -->
  <article class="box" data-sid="tasks">
    <span class="eyebrow">Execution</span>
    <h2>Full task breakdown</h2>
    <p class="sub">Every task by phase. Check items off as you go (toggle the <code>done</code> class on any <code>&lt;li&gt;</code>), and add owners in the amber tag.</p>

    <h3 style="margin:8px 0 4px;font-size:1.05rem">A · Foundation &amp; setup (Aug, Wk 1–3)</h3>
    <ul class="checklist">
      <li>Confirm event date, format &amp; agenda skeleton with programming team <span class="owner">Programming</span></li>
      <li>Lock venue details with Chelsea Hotel (Mountbatten Salon, coat check, green room, 2nd-floor access, exhibitor setup morning-of) <span class="owner">Ops</span></li>
      <li>Set internal registration deadline + headcount targets <span class="owner">Ops</span></li>
      <li>Stand up microsite skeleton (biohubnet.ca/2026-annual-symposium) <span class="owner">Web</span></li>
      <li>Design 2026 key visual, flyer, signage/wayfinding, pillar stickers <span class="owner">Design</span></li>
      <li>Email blast #1 — Save-the-Date <span class="owner">Marketing</span></li>
      <li>LinkedIn Save-the-Date post + bio-link update <span class="owner">Social</span></li>
      <li>Draft &amp; revise the sponsorship package PDF (new tiers + 2025 metrics) <span class="owner">Marketing</span></li>
      <li>Build the sponsor prospect list &amp; outreach template <span class="owner">Marketing</span></li>
    </ul>

    <h3 style="margin:16px 0 4px;font-size:1.05rem">B · Registration &amp; sponsorship (Aug–Oct, Wk 4–10)</h3>
    <ul class="checklist">
      <li>Set up Luma with tiered tickets ($20/HQP; eligible vs. ineligible HQP + industry) <span class="owner">Ops</span></li>
      <li>Publish full landing page with preliminary agenda + registration <span class="owner">Web</span></li>
      <li>Distribute print posters/flyers to 14 partner campuses, labs, hubs <span class="owner">Marketing</span></li>
      <li>Send sponsorship outreach; track responses; ask sponsors to promote twice <span class="owner">Marketing</span></li>
      <li>Close sponsors; add logos to microsite/signage/emails as they confirm <span class="owner">Marketing</span></li>
      <li>Confirm keynote + Panels 1–3 speakers (incl. AI-in-the-Workplace panellists) <span class="owner">Programming</span></li>
      <li>Confirm Training Week partners (OBIO, CATTI, BioZone, CL3/THCF, OmniaBio, Eurofins) <span class="owner">Programming</span></li>
      <li>Email #2 — program themes <span class="owner">Marketing</span></li>
    </ul>

    <h3 style="margin:16px 0 4px;font-size:1.05rem">C · Content &amp; engagement (Sep–Oct, Wk 6–12)</h3>
    <ul class="checklist">
      <li>Book videographer; storyboard promo + HQP testimonial videos <span class="owner">Marketing</span></li>
      <li>Film registration promo video + opening/looping videos <span class="owner">Videographer</span></li>
      <li>Produce Speaker Spotlight cards (keynote + each panellist) <span class="owner">Design</span></li>
      <li>Run the Speaker Spotlight posting series <span class="owner">Social</span></li>
      <li>Publish agenda PDF + "why attend" reel <span class="owner">Social</span></li>
      <li>Post one teaser per workshop / CDMO tour / CL3 tour <span class="owner">Social</span></li>
      <li>Order merch/print (allow 4–6 wks) <span class="owner">Ops</span></li>
      <li>Set up Otter.ai for live capture <span class="owner">Marketing</span></li>
    </ul>

    <h3 style="margin:16px 0 4px;font-size:1.05rem">D · Final countdown (Oct, Wk 12–13)</h3>
    <ul class="checklist">
      <li>"2 weeks to go" post + sponsor thank-you post <span class="owner">Social</span></li>
      <li>Attendee info email (location, transit, agenda) <span class="owner">Marketing</span></li>
      <li>"Getting There" logistics social post <span class="owner">Social</span></li>
      <li>Registration-closing notice / final reminder <span class="owner">Marketing</span></li>
      <li>Day-before hype post tagging speakers/partners <span class="owner">Social</span></li>
      <li>Prep run-of-show doc with pre-drafted captions per agenda slot <span class="owner">Social</span></li>
      <li>Confirm merch delivery, signage setup, registration desk materials; double-check AV <span class="owner">Ops</span></li>
    </ul>

    <h3 style="margin:16px 0 4px;font-size:1.05rem">E · Live event (Oct 26–29)</h3>
    <ul class="checklist">
      <li>Training Week kickoff + per-session posts (Days 1–3) <span class="owner">Social</span></li>
      <li>CDMO tour reels (OmniaBio, Eurofins) <span class="owner">Videographer</span></li>
      <li>Symposium AM: "We're live", Welcome Remarks, keynote + Panel 1/2 highlights <span class="owner">Social</span></li>
      <li>Symposium PM: speed networking, AI panel, VentureLift, pitch competition, reception <span class="owner">Social</span></li>
      <li>Photographer + videographer capture per shot-list <span class="owner">Videographer</span></li>
      <li>Same-night "that's a wrap" thank-you post (tag speakers/judges/partners/sponsors) <span class="owner">Marketing</span></li>
    </ul>

    <h3 style="margin:16px 0 4px;font-size:1.05rem">F · Post-event &amp; reporting (Oct 29 → Dec)</h3>
    <ul class="checklist">
      <li>Website recap gallery + post-event survey to attendees <span class="owner">Web</span></li>
      <li>Publish 1–2 min highlight reel <span class="owner">Videographer</span></li>
      <li>Reshare best attendee / partner reflections <span class="owner">Social</span></li>
      <li>Upload full session/audio recordings <span class="owner">Ops</span></li>
      <li>Send sponsor thank-you deck with delivered impressions <span class="owner">Marketing</span></li>
      <li>Write &amp; design the flagship Impact Report <span class="owner">Marketing</span></li>
      <li>Report-launch post + email to the list <span class="owner">Marketing</span></li>
    </ul>
  </article>
  </section>
</main>`;
