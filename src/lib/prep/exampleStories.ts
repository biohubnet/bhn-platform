/**
 * Canonical STAR examples for the Story Bank builder.
 *
 * These are FULLY-WORKED, READY-tier stories that span the four kinds
 * of moments a trainee usually needs to talk about in a biotech /
 * applied-science interview:
 *
 *   1. Wet-lab rescue   — the experiment that nearly failed
 *   2. Customer / team  — the people moment that needed mediating
 *   3. Data crunch      — the analysis with a real number at the end
 *   4. Cross-team       — the project that needed someone to glue it
 *
 * Each example targets the heuristic validator's thresholds — every
 * field falls in the 30–80 / 15–50 / 60–150 / 25–80 word band, every
 * Result section has a quantified outcome, every Action section uses
 * first-person voice. So if a trainee clicks "Use as starting point"
 * they're starting from a green-light draft and only tailoring.
 *
 * Voice: applied-science early-career — concrete, slightly nerdy,
 * never corporate-bingo. Numbers are deliberately modest (no $100M
 * IPOs) so trainees recognise themselves in them.
 */

export interface ExampleStory {
  id: string;
  /** Short title shown on the example card. */
  title: string;
  /** One-sentence framing — what kind of moment this story illustrates. */
  blurb: string;
  /** Tag chips shown on the card — the kinds of postings it fits. */
  tags: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
}

export const EXAMPLE_STORIES: ExampleStory[] = [
  {
    id: "ex-cell-rescue",
    title: "The bioreactor that crashed at 2 a.m.",
    blurb:
      "A wet-lab rescue — what to say when a long-running experiment nearly fails on your watch.",
    tags: ["bioreactor", "wet lab", "troubleshooting"],
    situation:
      "During my fourth-year thesis I was running a fed-batch bioreactor culture of Pichia pastoris for a 96-hour expression run. On the third night the dissolved-oxygen probe spiked to zero and the agitation alarm fired around 2 a.m. while no one else was in the lab.",
    task:
      "I had to stabilise the culture before cell viability dropped below the publishable threshold, without contaminating the vessel or invalidating the rest of the run.",
    action:
      "I drove in, confirmed the probe had drifted rather than the culture actually crashing by sampling and reading DO offline with a portable meter. I recalibrated the in-line probe against the offline reading, increased agitation manually from 400 to 600 rpm to compensate, and logged a deviation note in the batch record. I texted my supervisor with photos of both readings, then watched the vessel until 5 a.m. to confirm steady state before going home.",
    result:
      "The run finished at hour 96 with cell viability at 94 percent — 2 points above our 92 percent target — and the protein yield came in at 14.6 g/L, the highest of the four runs that summer.",
  },
  {
    id: "ex-customer-escalation",
    title: "The customer who wanted a refund I couldn't approve",
    blurb:
      "A people moment — how you turn a heated complaint into a working resolution.",
    tags: ["customer service", "communication", "de-escalation"],
    situation:
      "While working as a summer barista, a regular customer returned five minutes after I'd made her drink, very upset that the milk was wrong. She had a medical reason — a dairy allergy — and felt I hadn't listened. The store was full and three people were already in line behind her.",
    task:
      "I needed to make her feel heard, fix the drink, and protect the queue from spilling out the door, without breaking the store's no-refund-without-manager policy.",
    action:
      "I stepped out from behind the bar, apologised directly, and asked her to step to the side counter so I could remake the drink personally. I asked the second barista to keep the queue moving. I poured the wrong drink down the sink in front of her so she'd see it wasn't going back into the rotation, then remade it with oat milk and double-checked the label with her before handing it over. I told her I'd flag her preference in our regulars' notebook so it wouldn't happen again.",
    result:
      "She left with the corrected drink, three weeks later wrote a Google review naming me directly, and the store's monthly rating climbed from 4.3 to 4.5 stars that quarter.",
  },
  {
    id: "ex-data-crunch",
    title: "The dataset nobody had time to clean",
    blurb:
      "A quantitative moment — the analysis with a real number at the end.",
    tags: ["data analysis", "Python", "research"],
    situation:
      "On a research-assistant placement at a public-health lab, the team had collected 14 months of inhaler-adherence data from a remote-monitoring pilot but nobody had cleaned the raw export. The PI wanted a preliminary trend chart for a grant deadline 10 days away.",
    task:
      "I owned the cleaning + analysis end-to-end — the PI didn't have a Python person on the team and was about to hand it to an external consultant.",
    action:
      "I wrote a pandas pipeline that deduplicated 18,400 timestamp rows, dropped 6 percent that were clearly device test-fires, imputed gaps under 24 hours using forward-fill, and rejected any participant with more than 30 days of contiguous gaps. I cross-checked 50 random rows against the original device logs to confirm the dedup wasn't dropping real puffs. I built a matplotlib weekly-adherence chart with a 4-week rolling mean and shared it with the PI two days before the deadline so she had time to push back on anything I'd flagged.",
    result:
      "The cleaned dataset went into the grant and into a poster at the Canadian Respiratory Conference; the analysis was reused by the next placement student and is still the team's reference cleaning script. The grant was awarded — $215,000 over two years.",
  },
  {
    id: "ex-cross-team",
    title: "The handoff between two teams nobody owned",
    blurb:
      "A cross-team moment — when you spot the gap and decide to fill it.",
    tags: ["project management", "ownership", "leadership"],
    situation:
      "On a co-op at a medical-device startup, the quality team and the firmware team were both blocked on whose responsibility it was to update the device's calibration document after a firmware change. Three weeks had passed; nobody owned it; the next regulatory submission was 12 days out.",
    task:
      "Nobody had explicitly asked me to fix it, but the submission was going to slip if it stayed stuck. I decided to own the handoff myself.",
    action:
      "I read the firmware change log, mapped each change to the calibration sections it might affect, and drafted a 3-page diff document showing exactly what needed updating. I booked a 30-minute meeting with one engineer from each team, walked them through the diff, and asked them to sign off section-by-section in the room. Where there was disagreement on a section I parked it on a follow-up list and moved on rather than letting the meeting stall. I sent a written summary that afternoon with named owners for each parked item.",
    result:
      "The calibration document was finalised four days later — well inside the 12-day deadline — and the QA lead later asked me to use the same diff-document pattern on two more submissions that summer.",
  },
];
