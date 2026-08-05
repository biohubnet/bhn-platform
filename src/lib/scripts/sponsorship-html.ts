/**
 * Sponsorship Package document — seeded into Workspace → Marketing as an
 * editable HTML doc (same mechanism as the Symposium Comms Plan), so the
 * team edits it in-app and shares a link rather than mailing a PDF around.
 *
 * Provenance of the copy below:
 *   • The symposium description and the "Why Sponsor?" section are the
 *     approved wording from `Sponsorship package suggestions.docx`.
 *   • Tier names, benefits and pricing are DELIBERATELY left blank. The
 *     2025 package PDF uses subset-embedded fonts with no ToUnicode map,
 *     so its figures could not be read programmatically — inventing them
 *     would be worse than leaving them for a human. The "Before you send
 *     this" panel lists exactly what to fill in.
 *
 * Bump SPONSORSHIP_VERSION whenever the pristine baseline changes; the
 * seeder only overwrites docs that don't already carry the current marker,
 * so a team's real edits are never clobbered.
 */

export const SPONSORSHIP_VERSION = "1";

export const SPONSORSHIP_CSS = `:root {
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
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #fbfbf7;
      color: var(--ink);
      font-family: Verdana, Geneva, sans-serif;
      font-size: 15px;
      line-height: 1.55;
    }

    main {
      width: min(1060px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 36px 0 64px;
    }

    header {
      border-bottom: 4px solid var(--green);
      padding-bottom: 20px;
      margin-bottom: 26px;
    }

    .label {
      color: var(--green);
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-weight: bold;
      margin: 0 0 10px;
    }

    h1 { font-size: 30px; line-height: 1.15; margin: 0 0 10px; }
    h2 {
      font-size: 19px;
      margin: 34px 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--line);
    }
    h3 { font-size: 15px; margin: 22px 0 8px; }
    p { margin: 0 0 12px; max-width: 74ch; }
    ul { margin: 0 0 14px; padding-left: 22px; }
    li { margin-bottom: 6px; }

    .sub { color: var(--muted); font-size: 15px; margin: 0; }

    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px 20px;
      margin: 18px 0;
    }

    .todo {
      background: var(--gold-soft);
      border-left: 4px solid var(--gold);
      border-radius: 0 6px 6px 0;
      padding: 16px 18px;
      margin: 20px 0;
    }
    .todo strong { color: #7a5a12; }

    table { border-collapse: collapse; width: 100%; margin: 14px 0 18px; font-size: 14px; }
    th, td { border: 1px solid var(--line); padding: 10px 12px; text-align: left; vertical-align: top; }
    thead th { background: var(--green-soft); color: var(--green); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
    tbody th { background: var(--soft); font-weight: bold; width: 30%; }
    td.fill { color: #9aa2a8; font-style: italic; }

    .grid { display: flex; flex-wrap: wrap; gap: 14px; margin: 16px 0; }
    .card {
      flex: 1 1 260px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-top: 3px solid var(--blue);
      border-radius: 8px;
      padding: 16px 18px;
    }
    .card h3 { margin: 0 0 6px; color: var(--blue); }
    .card p { margin: 0; color: var(--muted); font-size: 14px; }

    .steps { counter-reset: s; list-style: none; padding: 0; margin: 14px 0; }
    .steps li {
      counter-increment: s;
      position: relative;
      padding: 0 0 14px 40px;
      border-left: 2px solid var(--line);
      margin-left: 12px;
    }
    .steps li:last-child { border-left-color: transparent; padding-bottom: 0; }
    .steps li::before {
      content: counter(s);
      position: absolute; left: -13px; top: -2px;
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--green); color: #fff;
      font-size: 12px; font-weight: bold;
      display: flex; align-items: center; justify-content: center;
    }

    footer {
      margin-top: 36px; padding-top: 16px;
      border-top: 1px solid var(--line);
      color: var(--muted); font-size: 13px;
    }`;

export const SPONSORSHIP_HTML = `<main data-sponsorship-version="1">
      <header>
        <p class="label">BioHubNet &middot; Annual Symposium &amp; Training Week</p>
        <h1>Sponsorship Package</h1>
        <p class="sub">Partner with Canada&rsquo;s biomanufacturing talent network.</p>
      </header>

      <div class="todo">
        <p><strong>Before you send this &mdash; fill in the blanks.</strong></p>
        <ul>
          <li>Event date, venue and city</li>
          <li>Tier names, prices and the benefit grid (the <em>To confirm</em> cells below)</li>
          <li>Attendance figures from the most recent symposium</li>
          <li>Sponsorship contact name and email</li>
          <li>Deadline for confirming sponsorship and for supplying logos</li>
        </ul>
        <p>Delete this panel once the package is complete.</p>
      </div>

      <h2>About the symposium</h2>
      <p>The BioHubNet Annual Symposium is a flagship event that brings together Canada&rsquo;s
        leading minds in biomanufacturing, research, and innovation &ndash; including highly
        qualified personnel (HQP), industry leaders, academic experts, government
        representatives, and innovation partners from across the country.</p>
      <p>With a strong focus on workforce development, emerging technologies, and building
        national capacity, the symposium serves as a platform to exchange insights, foster
        collaboration, and shape the future of Canada&rsquo;s biomanufacturing and life sciences
        ecosystem.</p>

      <h2>Why sponsor?</h2>
      <p>Sponsoring the BioHubNet Annual Symposium positions your organization at the forefront
        of Canada&rsquo;s growing biomanufacturing and life sciences ecosystem. As a sponsor, this
        will be an opportunity to:</p>
      <div class="grid">
        <div class="card">
          <h3>Showcase your brand</h3>
          <p>Reach a national audience of key decision-makers and future talent.</p>
        </div>
        <div class="card">
          <h3>Build connections</h3>
          <p>Meet globally recognized researchers, entrepreneurs, and industry stakeholders.</p>
        </div>
        <div class="card">
          <h3>Demonstrate leadership</h3>
          <p>Advance talent development, innovation, and Canada&rsquo;s biomanufacturing future.</p>
        </div>
      </div>
      <p>Your partnership helps us create a stronger, more connected ecosystem &ndash; while giving
        your organization unique visibility and engagement opportunities.</p>

      <h2>Event at a glance</h2>
      <table>
        <tbody>
          <tr><th>Date</th><td class="fill">To confirm</td></tr>
          <tr><th>Venue</th><td class="fill">To confirm</td></tr>
          <tr><th>Expected attendance</th><td class="fill">To confirm</td></tr>
          <tr><th>Audience</th><td>HQP, industry leaders, academic experts, government
            representatives, innovation partners</td></tr>
          <tr><th>Format</th><td class="fill">To confirm &mdash; keynote, panels, workshops, networking</td></tr>
        </tbody>
      </table>

      <h2>Sponsorship tiers</h2>
      <p>Replace the placeholder cells with the confirmed tier names, prices and benefits.</p>
      <table>
        <thead>
          <tr>
            <th>Benefit</th>
            <th>Tier 1 &mdash; <span class="fill">name</span></th>
            <th>Tier 2 &mdash; <span class="fill">name</span></th>
            <th>Tier 3 &mdash; <span class="fill">name</span></th>
          </tr>
        </thead>
        <tbody>
          <tr><th>Investment</th><td class="fill">To confirm</td><td class="fill">To confirm</td><td class="fill">To confirm</td></tr>
          <tr><th>Logo placement</th><td class="fill">To confirm</td><td class="fill">To confirm</td><td class="fill">To confirm</td></tr>
          <tr><th>Speaking opportunity</th><td class="fill">To confirm</td><td class="fill">To confirm</td><td class="fill">To confirm</td></tr>
          <tr><th>Exhibit / booth space</th><td class="fill">To confirm</td><td class="fill">To confirm</td><td class="fill">To confirm</td></tr>
          <tr><th>Complimentary registrations</th><td class="fill">To confirm</td><td class="fill">To confirm</td><td class="fill">To confirm</td></tr>
          <tr><th>Recognition in communications</th><td class="fill">To confirm</td><td class="fill">To confirm</td><td class="fill">To confirm</td></tr>
          <tr><th>Post-event report</th><td class="fill">To confirm</td><td class="fill">To confirm</td><td class="fill">To confirm</td></tr>
        </tbody>
      </table>

      <h2>Custom partnerships</h2>
      <p>Not every partnership fits a tier. We are glad to build a package around a specific
        goal &mdash; sponsoring a workshop stream, supporting HQP travel bursaries, hosting a
        networking reception, or underwriting the post-event report.</p>

      <h2>How to confirm</h2>
      <ol class="steps">
        <li>
          <h3>Get in touch</h3>
          <p>Email the sponsorship contact with the tier you have in mind.</p>
        </li>
        <li>
          <h3>Confirm the details</h3>
          <p>We send a short agreement covering benefits, deadlines and payment.</p>
        </li>
        <li>
          <h3>Send your assets</h3>
          <p>Logo files and a short organization blurb, by the asset deadline.</p>
        </li>
        <li>
          <h3>Join us</h3>
          <p>We handle placement, signage and introductions on the day.</p>
        </li>
      </ol>

      <div class="panel">
        <h3>Sponsorship contact</h3>
        <p class="fill">Name, title, email &mdash; to confirm</p>
      </div>

      <footer>
        BioHubNet &middot; Sponsorship Package &middot; edit this document in
        Workspace &rarr; Marketing &rarr; Sponsorship Package.
      </footer>
    </main>`;
