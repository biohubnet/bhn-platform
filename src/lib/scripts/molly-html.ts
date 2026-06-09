// AUTO-GENERATED from molly-interview-prep-guide.html. The original guide's
// body markup + stylesheet, preserved verbatim so the seeded script keeps its
// original styling. Rendered inside a sandboxed iframe (see HtmlScriptEditor).

export const MOLLY_CSS = `:root {
      --ink: #1f2428;
      --muted: #626b73;
      --line: #d9ddd8;
      --soft: #f5f7f2;
      --panel: #ffffff;
      --green: #2f5d50;
      --green-soft: #e7f0eb;
      --gold: #b88a2d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #fbfbf7;
      color: var(--ink);
      font-family: Verdana, Geneva, sans-serif;
      font-size: 15px;
      line-height: 1.5;
    }

    main {
      width: min(980px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 36px 0 48px;
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

    h1,
    h2,
    h3 {
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.12;
      letter-spacing: 0;
    }

    h1 {
      margin: 8px 0 8px;
      font-size: clamp(2.1rem, 5vw, 3.7rem);
      font-weight: 700;
    }

    .intro {
      max-width: 780px;
      margin: 0;
      color: var(--muted);
      font-size: 1.02rem;
    }

    .top-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 18px;
    }

    .box {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 18px;
    }

    .box.accent {
      background: var(--green-soft);
      border-color: #c9ded4;
    }

    .box h2 {
      margin: 0 0 8px;
      font-size: 1.28rem;
    }

    .box p {
      margin: 0;
    }

    .box p + p {
      margin-top: 10px;
    }

    .prompt-list {
      display: grid;
      gap: 14px;
    }

    .prompt-card {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 18px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 18px;
    }

    .prompt-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--green);
      color: #fff;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .prompt-card h2 {
      margin: 0 0 10px;
      font-size: 1.35rem;
    }

    .ask {
      margin: 0;
      color: var(--green);
      font-weight: 700;
    }

    ul {
      margin: 8px 0 0;
      padding-left: 1.1rem;
    }

    li + li {
      margin-top: 5px;
    }

    .possible-language {
      margin-top: 12px;
      border-left: 4px solid var(--gold);
      padding: 8px 0 8px 12px;
      color: #3c4247;
      font-weight: 600;
    }

    .guide-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 18px;
    }

    .guide-grid h2 {
      margin: 0 0 10px;
      font-size: 1.28rem;
    }

    .script-section {
      margin-top: 18px;
      display: grid;
      gap: 16px;
    }

    .script-box {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 18px;
    }

    .script-box h2 {
      margin: 0 0 10px;
      font-size: 1.28rem;
    }

    .script-lines {
      display: grid;
      gap: 8px;
      margin: 0;
      color: #343b3f;
      font-size: 0.98rem;
      line-height: 1.48;
    }

    .full-script {
      margin-top: 18px;
      border: 1px solid #c9ded4;
      border-radius: 8px;
      background: #f8fbf8;
      padding: 20px;
    }

    .full-script h2 {
      margin: 0 0 8px;
      font-size: 1.45rem;
    }

    .script-note {
      margin: 0 0 16px;
      color: var(--muted);
    }

    .intercut-list {
      display: grid;
      gap: 10px;
    }

    .intercut-row {
      display: grid;
      grid-template-columns: 150px 1fr 190px;
      gap: 14px;
      align-items: start;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 14px;
    }

    .speaker {
      color: var(--green);
      font-weight: 700;
    }

    .script-copy {
      margin: 0;
      color: #22292d;
      font-size: 0.98rem;
    }

    .visual-note {
      margin: 0;
      color: var(--muted);
      font-size: 0.88rem;
    }

    .optional-script {
      margin-top: 14px;
      border-left: 4px solid var(--gold);
      padding-left: 14px;
    }

    .cue {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--soft);
      color: #34403a;
      font-weight: 600;
    }

    .small {
      color: var(--muted);
      font-size: 0.92rem;
    }

    .note {
      margin-top: 10px;
      color: var(--muted);
      font-size: 0.94rem;
    }

    @media (max-width: 820px) {
      .top-grid,
      .overview-grid,
      .prompt-card,
      .guide-grid,
      .intercut-row {
        grid-template-columns: 1fr;
      }
    }

    @media print {
      body {
        background: #fff;
        font-size: 12px;
      }

      main {
        width: 100%;
        padding: 0;
      }

      .box,
      .prompt-card {
        break-inside: avoid;
      }
    }`;

export const MOLLY_HTML = `<main>
    <header>
      <div class="label">BHN Scientific Directors Video</div>
      <h1>Molly Interview Conversation Guide</h1>
      <p class="intro">This guide is here to support Molly's voice as the lead scientific perspective in the video. It is not a script. The best answers will sound like Molly: thoughtful, clear, and grounded in her own experience.</p>
    </header>

    <section class="top-grid" aria-label="Interview framing">
      <article class="box accent">
        <h2>Project Overview</h2>
        <p>This is an introductory video for BHN's target audiences, including HQP, industry partners, public partners, and the broader ecosystem.</p>
        <p>The goal is to communicate Canada's research strength, the biomanufacturing readiness gaps revealed during the pandemic, why BioHubNet was created, the national role it plays as a connected talent and training network, and who it serves.</p>
      </article>
    </section>

    <section class="overview-grid" aria-label="Project details">
      <article class="box">
        <h2>Filming Plan</h2>
        <ul>
          <li>Proposed filming date: 3rd or 4th week of April.</li>
          <li>Commitment: 1.5 hours with Molly for interview and B-roll in the lab.</li>
          <li>Commitment: 1 hour each for Gilbert and Darius.</li>
          <li>Final video length: 2.5 minutes, with editing done in May.</li>
        </ul>
      </article>

      <article class="box">
        <h2>Voice And Tone</h2>
        <p>Molly will be the lead voice in the video, guiding the narrative through a conversational, question-based format.</p>
        <p>Gilbert and Darius will complement Molly's perspective with shorter, more focused segments.</p>
        <p>The tone is visionary but grounded, with emphasis on national impact and future readiness.</p>
      </article>

      <article class="box">
        <h2>Additional Capture</h2>
        <p>Use this filming opportunity to capture a few scripted lines promoting the 2026 Annual Symposium.</p>
      </article>
    </section>

    <section class="top-grid" aria-label="Molly framing">
      <article class="box accent">
        <h2>For Molly</h2>
        <p>Your role is to help people understand why BioHubNet matters now, what it is building for Canada, and why investing in people is central to future readiness.</p>
        <p class="note">Use the prompts only as a starting point. Your own wording, emphasis, and judgment are the priority.</p>
      </article>
    </section>

    <section class="prompt-list" aria-label="Molly interview prompts">
      <article class="prompt-card">
        <div>
          <div class="prompt-number">1</div>
          <h2>Why does BioHubNet exist now?</h2>
          <p class="ask">Question to ask:</p>
          <p class="small">"Let's start broad. What gap is BioHubNet responding to, and why does it matter for Canada?"</p>
        </div>
        <div>
          <p class="ask">You may want to touch on:</p>
          <ul>
            <li>Canada has world-class biomedical research and strong scientific talent.</li>
            <li>The pandemic showed that research strength alone is not enough.</li>
            <li>Canada needs more biomanufacturing capacity and experienced talent.</li>
            <li>BioHubNet was created as a direct response to that gap.</li>
          </ul>
          <div class="possible-language">Possible phrasing, only if it feels natural: "Without the right talent pipeline, even our best research cannot reach its full impact."</div>
        </div>
      </article>

      <article class="prompt-card">
        <div>
          <div class="prompt-number">2</div>
          <h2>What is BioHubNet building for Canada?</h2>
          <p class="ask">Question to ask:</p>
          <p class="small">"When you describe BioHubNet at the national level, what are we building?"</p>
        </div>
        <div>
          <p class="ask">You may want to touch on:</p>
          <ul>
            <li>A national talent engine for Canada's biomanufacturing future.</li>
            <li>Training highly qualified personnel who understand both science and application.</li>
            <li>Preparing people to move across academia, industry, and public health.</li>
            <li>Building readiness for future health challenges.</li>
          </ul>
          <div class="possible-language">Possible phrasing, only if it feels natural: "This is about preparing people who can move ideas from discovery toward real-world impact."</div>
        </div>
      </article>

      <article class="prompt-card">
        <div>
          <div class="prompt-number">3</div>
          <h2>Why does the network model matter?</h2>
          <p class="ask">Question to ask:</p>
          <p class="small">"Why does this work need to happen as a connected national network?"</p>
        </div>
        <div>
          <p class="ask">You may want to touch on:</p>
          <ul>
            <li>No single institution can solve the talent challenge alone.</li>
            <li>BioHubNet connects universities, industry, and public-sector partners.</li>
            <li>The network helps align training with real-world needs.</li>
            <li>Coordination across Canada makes the work stronger and more scalable.</li>
          </ul>
          <div class="possible-language">Possible phrasing, only if it feels natural: "The network matters because talent development has to be connected to where the needs actually are."</div>
        </div>
      </article>

      <article class="prompt-card">
        <div>
          <div class="prompt-number">4</div>
          <h2>Who is this for, and what does success look like?</h2>
          <p class="ask">Question to ask:</p>
          <p class="small">"Who should see themselves in BioHubNet, and what does success look like for Canada?"</p>
        </div>
        <div>
          <p class="ask">You may want to touch on:</p>
          <ul>
            <li>HQP and trainees who want their work to have impact beyond the lab.</li>
            <li>Industry partners who need talent ready to contribute.</li>
            <li>Public and ecosystem partners working toward national readiness.</li>
            <li>Success means a Canada that is resilient, self-reliant, and ready for health challenges.</li>
          </ul>
          <div class="possible-language">Possible phrasing, only if it feels natural: "Success starts with investing in people."</div>
        </div>
      </article>
    </section>

    <section class="guide-grid" aria-label="Prompting guide">
      <article class="box">
        <h2>Optional Follow-Ups</h2>
        <div class="cue">To invite personal emphasis: "What feels most important for you to say here?"</div>
        <div class="cue">To make the idea accessible: "How would you explain that to a trainee or partner hearing about BioHubNet for the first time?"</div>
        <div class="cue">To clarify without correcting: "Could we try one more version, a little more direct?"</div>
        <div class="cue">For the close: "What would you like people to understand after hearing from you?"</div>
      </article>

      <article class="box">
        <h2>Keep In Mind</h2>
        <ul>
          <li>Molly brings the national "why" and the big-picture scientific perspective.</li>
          <li>Gilbert can carry the industry-readiness details.</li>
          <li>Darius can carry the future-science and innovation details.</li>
          <li>Listen for the strongest natural answer, rather than forcing exact wording.</li>
          <li>If a retake is needed, frame it as giving Molly another option, not fixing a mistake.</li>
        </ul>
      </article>
    </section>

    <section class="script-section" aria-label="Supporting scripts">
      <article class="script-box">
        <h2>Gilbert - Script: Industry &amp; Translation</h2>
        <div class="script-lines">
          <p>Biomanufacturing is complex.</p>
          <p>It requires precision, regulatory understanding, and the ability to scale safely.</p>
          <p>There has historically been a gap between academic training and industry readiness.</p>
          <p>BioHubNet is helping close that gap.</p>
          <p>We embed real industry exposure into training through hands-on experience, internships, and partnerships.</p>
          <p>For industry, this means talent ready to contribute immediately.</p>
          <p>For trainees, it means understanding how innovation becomes real-world products.</p>
        </div>
      </article>

      <article class="script-box">
        <h2>Darius - Script: Innovation &amp; Future Science</h2>
        <div class="script-lines">
          <p>The future of biomanufacturing is rapidly evolving.</p>
          <p>From mRNA to cell and gene therapies, the field is advancing fast.</p>
          <p>Canada needs talent trained at the cutting edge.</p>
          <p>BioHubNet integrates emerging technologies, data, and interdisciplinary thinking.</p>
          <p>Our trainees operate across science, engineering, and policy.</p>
          <p>This is about building adaptive leaders for the next generation of innovation.</p>
        </div>
      </article>
    </section>

    <section class="full-script" aria-label="Draft full intercut script">
      <h2>Draft Full Intercut Script</h2>
      <p class="script-note">A possible 2.5-minute edit, with Molly as the narrative spine and Gilbert and Darius adding focused supporting perspectives. This is a draft to shape the interview, not a line-by-line requirement.</p>

      <div class="intercut-list">
        <article class="intercut-row">
          <div class="speaker">Molly</div>
          <p class="script-copy">Canada has extraordinary strength in biomedical research. We have world-class scientists, breakthrough discoveries, and a strong academic foundation. But the pandemic made something very clear: research strength alone is not enough. We also need the biomanufacturing capacity, and the trained people, to turn discovery into real-world readiness.</p>
          <p class="visual-note">Opening portrait, lab B-roll, students at work.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Gilbert</div>
          <p class="script-copy">Biomanufacturing is complex. It requires precision, regulatory understanding, and the ability to scale safely. There has historically been a gap between academic training and industry readiness.</p>
          <p class="visual-note">Industry-style process visuals, equipment, hands-on work.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Molly</div>
          <p class="script-copy">BioHubNet was created as a direct response to that gap. Without the right talent pipeline, even our best research cannot reach its full impact. So the question is not only what Canada can discover. It is whether we have the people and the connected training system to move those discoveries forward.</p>
          <p class="visual-note">Molly in lab, cutaways to team interaction.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Darius</div>
          <p class="script-copy">The future of biomanufacturing is rapidly evolving. From mRNA to cell and gene therapies, the field is advancing fast. Canada needs talent trained at the cutting edge.</p>
          <p class="visual-note">Future-facing lab work, data, instrumentation.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Molly</div>
          <p class="script-copy">What BioHubNet is building is a national talent engine for Canada's biomanufacturing future. We are training highly qualified personnel who understand the science, but also understand how that science connects to industry, public health, and the needs of the broader ecosystem.</p>
          <p class="visual-note">Network visuals, trainees, collaborative moments.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Gilbert</div>
          <p class="script-copy">BioHubNet is helping close the gap by embedding real industry exposure into training through hands-on experience, internships, and partnerships. For industry, this means talent ready to contribute immediately. For trainees, it means understanding how innovation becomes real-world products.</p>
          <p class="visual-note">Hands-on training, mentorship, internship-style footage.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Darius</div>
          <p class="script-copy">BioHubNet integrates emerging technologies, data, and interdisciplinary thinking. Our trainees operate across science, engineering, and policy. This is about building adaptive leaders for the next generation of innovation.</p>
          <p class="visual-note">Data screens, interdisciplinary work, students collaborating.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Molly</div>
          <p class="script-copy">The network model matters because no single institution can solve this challenge alone. BioHubNet connects universities, industry leaders, and public-sector partners across Canada, so talent development is aligned with real-world needs and coordinated at national scale.</p>
          <p class="visual-note">Partners, group conversations, campus and lab transitions.</p>
        </article>

        <article class="intercut-row">
          <div class="speaker">Molly</div>
          <p class="script-copy">If you are someone who wants your work to go beyond the lab, and to contribute to something with real national impact, BioHubNet is designed for you. Success means a Canada that is resilient, self-reliant, and ready to respond to future health challenges. And that starts with investing in people.</p>
          <p class="visual-note">Closing Molly portrait, trainees, confident final frame.</p>
        </article>
      </div>

      <div class="optional-script">
        <h3>Optional 2026 Annual Symposium Pickup</h3>
        <p class="script-copy"><strong>Molly:</strong> As we look ahead to the 2026 Annual Symposium, we are excited to bring this community together: trainees, researchers, industry partners, and public-sector leaders who are helping shape Canada's biomanufacturing future.</p>
      </div>
    </section>
  </main>`;
