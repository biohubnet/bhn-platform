/**
 * Course catalogue seed.
 *
 * Fills the catalogue with a minimum-viable set of courses modelled on the
 * live BioHubNet platform: every course carries the facet fields the
 * catalogue filters on (topic / provider / delivery), a 100-credit cost, and
 * enough modules plus a knowledge check to be genuinely takeable rather than
 * a listing that dead-ends on an empty page.
 *
 * Coverage is deliberate, not incidental — the set touches all nine
 * COURSE_TOPICS, all four COURSE_DELIVERY modes and four providers, so no
 * filter facet in the UI returns an empty result.
 *
 * ALL CONTENT HERE IS INVENTED for this deployment. No real trainee,
 * enrolment or certificate data is reproduced. Course titles follow the
 * shape of the live catalogue so the UI reads realistically.
 *
 * Idempotent: courses are matched by `code`. Re-running updates the course
 * row in place and rebuilds its modules and assessment, so enrolments
 * survive a re-seed (module progress does not — this is seed content).
 *
 *   npx tsx prisma/seed-catalog.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedModule {
  title: string;
  duration: number;
  content: string;
}

interface SeedQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface SeedCourse {
  code: string;
  title: string;
  description: string;
  topic: string;
  provider: string;
  delivery: string;
  duration: number;
  creditCost: number;
  isSpecial: boolean;
  tags: string[];
  modules: SeedModule[];
  quiz: { title: string; questions: SeedQuestion[] };
}

const COURSES: SeedCourse[] = [
  {
    code: "TA-AI-101",
    title: "AI in Life Sciences",
    description:
      "How machine learning is reshaping drug discovery, clinical development and manufacturing — what the technology actually does, where it fails, and which roles in a life-sciences organisation are changing because of it.",
    topic: "Sector/Technology Overview",
    provider: "Talent Accelerator",
    delivery: "Asynchronous",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["AI", "machine learning", "drug discovery", "digital health"],
    modules: [
      {
        title: "Where AI Actually Sits in the Pipeline",
        duration: 20,
        content: `
<h2>Where AI Actually Sits in the Pipeline</h2>
<p>"AI in life sciences" covers a wide range of very different techniques applied at very different stages. Being specific about which one is meant is the difference between a useful conversation and a marketing one.</p>
<h3>Discovery and target identification</h3>
<p>Machine learning models trained on genomic, proteomic and literature data propose which biological targets are worth pursuing. Structure-prediction models such as those in the AlphaFold lineage have changed how quickly a team can go from sequence to a usable structural hypothesis.</p>
<h3>Lead optimisation</h3>
<p>Generative chemistry models propose candidate molecules with desired properties. The models do not replace medicinal chemists — they widen the set of molecules a chemist considers, and the chemist still decides what gets synthesised.</p>
<h3>Clinical development</h3>
<ul>
  <li><strong>Trial design</strong> — modelling likely recruitment rates and dropout before a protocol is locked</li>
  <li><strong>Site selection</strong> — predicting which investigator sites will actually enrol</li>
  <li><strong>Safety signal detection</strong> — surfacing adverse-event patterns across large datasets</li>
</ul>
<h3>Manufacturing and quality</h3>
<p>Process models predict batch outcomes from in-line sensor data, and vision systems perform visual inspection. These are the applications closest to regulatory scrutiny, because a model that influences batch disposition is part of the quality system.</p>
`,
      },
      {
        title: "Data, Validation and Why Models Fail",
        duration: 20,
        content: `
<h2>Data, Validation and Why Models Fail</h2>
<p>Most failed AI projects in this sector fail for reasons that have nothing to do with the algorithm.</p>
<h3>The data problem comes first</h3>
<p>Life-sciences data is small, expensive, heavily siloed and frequently not machine-readable. A model trained on one organisation's historical assay data often degrades sharply when the assay protocol changes — and assay protocols change constantly.</p>
<h3>Common failure modes</h3>
<ul>
  <li><strong>Distribution shift</strong> — the data at deployment no longer matches the data the model was trained on: a different patient population, a different site or instrument, or a changed assay protocol</li>
  <li><strong>Label leakage</strong> — information that would not be available at prediction time leaked into training</li>
  <li><strong>Optimising the wrong endpoint</strong> — a model that predicts a surrogate marker well but has no bearing on clinical outcome</li>
  <li><strong>No path to action</strong> — a prediction nobody is empowered to act on changes nothing</li>
</ul>
<h3>Validation in a regulated context</h3>
<p>If a model output influences a GxP decision, the model is part of the validated state of the system. That means documented intended use, defined performance criteria, change control, and a plan for what happens when the model is retrained. Teams that treat retraining as routine maintenance rather than a change-control event create findings for themselves.</p>
`,
      },
      {
        title: "Roles and Skills This Creates",
        duration: 20,
        content: `
<h2>Roles and Skills This Creates</h2>
<p>The most durable opportunities are not "AI researcher" roles. They are roles at the boundary, where domain knowledge and technical fluency have to sit in the same head.</p>
<h3>Roles growing fastest</h3>
<ul>
  <li><strong>Computational biologist</strong> — biological question first, code as the instrument</li>
  <li><strong>Bioinformatics scientist</strong> — pipeline construction, sequencing data at scale</li>
  <li><strong>Data engineer, life sciences</strong> — making the organisation's data usable at all</li>
  <li><strong>Computer systems validation specialist</strong> — qualifying software, including models, in a GxP environment</li>
  <li><strong>Clinical data manager</strong> — increasingly involved in data-quality tooling rather than manual review</li>
</ul>
<h3>What to build if you are moving toward these</h3>
<p>Fluency in Python and SQL is close to table stakes. Beyond that, the differentiator is being able to explain to a scientist why a model behaved as it did, and to a quality lead what evidence supports its use. Statistical literacy — particularly around confounding and multiple comparisons — matters more than familiarity with any particular framework.</p>
<p>Do not underestimate regulatory literacy. Someone who understands both a validation lifecycle and a training loop is rare, and rare is valuable.</p>
`,
      },
    ],
    quiz: {
      title: "AI in Life Sciences — Knowledge Check",
      questions: [
        {
          text: "A model output is used to help decide whether a manufactured batch is released. What does this imply?",
          options: [
            "Nothing — the model is a decision-support tool and sits outside the quality system",
            "The model forms part of the validated state of the system and is subject to change control",
            "Only the final human decision needs documenting",
            "The model must be retrained before every batch",
          ],
          correctAnswer:
            "The model forms part of the validated state of the system and is subject to change control",
          explanation:
            "Once a model influences a GxP decision such as batch disposition, it is part of the validated system: intended use, performance criteria and retraining all fall under change control.",
        },
        {
          text: "Which of the following best describes 'label leakage' in a predictive model?",
          options: [
            "Training labels were publicly disclosed",
            "Information unavailable at prediction time was present during training",
            "The dataset was too small to train on",
            "Patient identifiers were not removed",
          ],
          correctAnswer:
            "Information unavailable at prediction time was present during training",
          explanation:
            "Leakage inflates apparent performance because the model learned from information it will not have when deployed.",
        },
        {
          text: "According to the course, why are boundary roles more durable than pure research roles?",
          options: [
            "They typically pay more than pure research roles",
            "They require less specialist training to enter",
            "They pair domain knowledge with technical fluency, which is scarce",
            "They are less exposed to changes in regulatory expectations",
          ],
          correctAnswer:
            "They pair domain knowledge with technical fluency, which is scarce",
          explanation:
            "The scarce combination is someone who can explain model behaviour to a scientist and evidence its use to a quality lead.",
        },
        {
          text: "A model trained on one site's assay data degrades after the assay protocol changes. This is an example of:",
          options: ["Overfitting to noise", "Distribution shift", "Class imbalance", "Underfitting"],
          correctAnswer: "Distribution shift",
          explanation:
            "The input distribution at deployment no longer matches the training distribution, so learned relationships no longer hold.",
        },
      ],
    },
  },
  {
    code: "TA-CYB-101",
    title: "Introduction to Cybersecurity in Life Sciences",
    description:
      "Why life-sciences organisations are a high-value target, what an attack on a manufacturing or clinical environment actually looks like, and the controls that matter most in a regulated setting.",
    topic: "Sector/Technology Overview",
    provider: "Talent Accelerator",
    delivery: "Asynchronous",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["cybersecurity", "data integrity", "OT security", "compliance"],
    modules: [
      {
        title: "Why This Sector Is Targeted",
        duration: 20,
        content: `
<h2>Why This Sector Is Targeted</h2>
<p>Life-sciences organisations hold an unusually attractive combination of assets: valuable intellectual property, sensitive personal health information, and operational systems where downtime is extremely expensive.</p>
<h3>What attackers are after</h3>
<ul>
  <li><strong>Research IP</strong> — candidate molecules, assay methods, trial results ahead of publication</li>
  <li><strong>Clinical trial data</strong> — participant records carry both personal and commercial sensitivity</li>
  <li><strong>Manufacturing continuity</strong> — a stopped bioreactor can mean a lost batch worth millions, which makes extortion effective</li>
  <li><strong>Supply chain access</strong> — a small contract lab is often the softest route into a large partner</li>
</ul>
<h3>The pressure that makes it work</h3>
<p>A batch in progress cannot be paused indefinitely. A trial database locked mid-study creates regulatory exposure as well as commercial loss. Attackers understand that time pressure in this sector is unusually acute, and price their demands accordingly.</p>
<p>Smaller organisations are not spared. Contract research and contract manufacturing organisations are frequently targeted precisely because they connect to larger, better-defended partners.</p>
`,
      },
      {
        title: "IT, OT and the Gap Between Them",
        duration: 20,
        content: `
<h2>IT, OT and the Gap Between Them</h2>
<p>The single most common structural weakness in this sector is the boundary between corporate IT and the operational technology that runs laboratory and manufacturing equipment.</p>
<h3>Why OT is different</h3>
<ul>
  <li>Equipment lifetimes are measured in decades, so unsupported operating systems are common</li>
  <li>Patching may invalidate qualification, so patches are deferred</li>
  <li>Availability outranks confidentiality — you cannot simply take a system offline</li>
  <li>Vendors often require remote access for support</li>
</ul>
<h3>Controls that actually help</h3>
<p><strong>Segmentation</strong> is the highest-value control. If a compromised corporate workstation cannot reach the analytical instrument network, a phishing compromise stops at the boundary. <strong>Inventory</strong> comes next — organisations routinely discover instruments nobody knew were network-connected.</p>
<p><strong>Vendor access control</strong> matters disproportionately. Standing remote-access accounts for equipment vendors, often shared and rarely rotated, are a recurring root cause.</p>
<p><strong>Backups that are tested</strong> and held offline are what determine whether a ransomware event is a bad week or an existential one.</p>
`,
      },
      {
        title: "Data Integrity as a Security Problem",
        duration: 20,
        content: `
<h2>Data Integrity as a Security Problem</h2>
<p>In a regulated environment, security and data integrity are the same discipline viewed from two angles. The ALCOA+ principles that quality teams apply to records depend on controls that security teams own.</p>
<h3>Where they meet</h3>
<ul>
  <li><strong>Attributable</strong> — requires unique user accounts. Shared logins break both integrity and accountability</li>
  <li><strong>Contemporaneous</strong> — requires trustworthy system clocks and time synchronisation</li>
  <li><strong>Original</strong> — requires the raw electronic record to be retained, not a printout or summary standing in for it</li>
  <li><strong>Accurate</strong> — requires audit trails that capture the previous value on every change, and that users cannot alter or disable</li>
  <li><strong>Available</strong> — requires retention and recoverable backups over the record's full lifetime</li>
</ul>
<h3>The audit trail is a security control</h3>
<p>Regulators expect audit trails to be enabled, reviewed and protected from modification. An account with the ability to switch off audit logging is, from both perspectives, a critical privilege — and one that inspection findings frequently identify as over-granted.</p>
<h3>Practical starting point</h3>
<p>Ask three questions of any regulated system: who can change data without leaving a trace, who can change the clock, and who can turn logging off. The answers usually locate the real risk faster than a vulnerability scan.</p>
`,
      },
    ],
    quiz: {
      title: "Cybersecurity in Life Sciences — Knowledge Check",
      questions: [
        {
          text: "Why is patching frequently deferred on operational technology in a regulated manufacturing environment?",
          options: [
            "Patches are not available for industrial systems",
            "Patching may invalidate equipment qualification",
            "OT systems are not connected to any network",
            "Regulators prohibit patching",
          ],
          correctAnswer: "Patching may invalidate equipment qualification",
          explanation:
            "Qualified equipment operates in a validated state; a change such as a patch can require requalification, so patches are often deferred or batched.",
        },
        {
          text: "Which control does the course identify as the highest-value structural defence for OT environments?",
          options: ["Antivirus on every instrument", "Network segmentation", "Longer passwords", "Annual security training"],
          correctAnswer: "Network segmentation",
          explanation:
            "Segmentation contains a compromise at the boundary, so a phishing incident on the corporate network cannot reach instrument systems.",
        },
        {
          text: "Shared login accounts on a regulated system primarily undermine which ALCOA+ principle?",
          options: ["Legible", "Attributable", "Available", "Enduring"],
          correctAnswer: "Attributable",
          explanation:
            "Attributability requires that every action be traceable to a specific individual, which shared accounts make impossible.",
        },
        {
          text: "Why are contract research and manufacturing organisations frequently targeted?",
          options: [
            "They hold no valuable data of their own",
            "They are legally easier to attack",
            "They provide a softer route into larger, better-defended partners",
            "They are exempt from data protection law",
          ],
          correctAnswer:
            "They provide a softer route into larger, better-defended partners",
          explanation:
            "Supply-chain access is a recurring attack path: a smaller partner's trusted connection is used to reach the intended target.",
        },
      ],
    },
  },
  {
    code: "TA-CAR-101",
    title: "Careers in Life Science",
    description:
      "A structured map of the Canadian life-sciences job market: the functional areas, what people in them actually do day to day, how the employer types differ, and the realistic routes in from an academic background.",
    topic: "Career Insights",
    provider: "Talent Accelerator",
    delivery: "Asynchronous",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["careers", "job search", "Canada", "industry transition"],
    modules: [
      {
        title: "The Functional Map",
        duration: 20,
        content: `
<h2>The Functional Map</h2>
<p>Most people leaving academia know only two job titles: "scientist" and "professor". The industry is organised around functions, and knowing the map is the first step to targeting a search.</p>
<h3>Discovery and development</h3>
<ul>
  <li><strong>Research scientist</strong> — hypothesis-driven work, closest to the bench experience of a PhD</li>
  <li><strong>Process development</strong> — taking a molecule that works at small scale and making it manufacturable</li>
  <li><strong>Analytical development</strong> — building and validating the methods that measure product quality</li>
</ul>
<h3>Clinical and regulatory</h3>
<ul>
  <li><strong>Clinical research associate</strong> — monitoring investigator sites, heavy travel, strong entry route</li>
  <li><strong>Clinical data manager</strong> — database design, data cleaning, query resolution</li>
  <li><strong>Regulatory affairs associate</strong> — assembling and defending submissions to Health Canada and other agencies</li>
  <li><strong>Medical science liaison</strong> — scientific exchange with clinicians; usually requires an advanced degree</li>
</ul>
<h3>Manufacturing and quality</h3>
<ul>
  <li><strong>Manufacturing associate</strong> — operating the process under GMP; a genuine entry point</li>
  <li><strong>Quality control analyst</strong> — testing samples against specification</li>
  <li><strong>Quality assurance specialist</strong> — reviewing records, managing deviations, releasing batches</li>
</ul>
<h3>Commercial and enabling</h3>
<p>Business development, market access, medical affairs, project management and regulatory intelligence all draw on scientific training without requiring bench work.</p>
`,
      },
      {
        title: "Reading the Market Honestly",
        duration: 20,
        content: `
<h2>Reading the Market Honestly</h2>
<p>The Canadian sector is concentrated, cyclical and smaller than the American one. Planning around that reality produces better decisions than planning around a job board.</p>
<h3>Where the jobs are</h3>
<p>The Toronto–Hamilton corridor, Greater Montreal and Metro Vancouver hold the large majority of positions. Saskatoon is a genuine centre for agricultural biotechnology. Calgary and Edmonton have growing health-technology activity. Outside these, roles exist but are sparse, and relocation is often the fastest route to a first industry job.</p>
<h3>Employer types behave differently</h3>
<ul>
  <li><strong>Large pharma affiliates</strong> — structured, commercial and regulatory heavy, relatively little R&amp;D in Canada</li>
  <li><strong>Contract organisations (CRO/CDMO)</strong> — high volume of entry roles, excellent training, demanding pace</li>
  <li><strong>Small and mid-size biotech</strong> — broad responsibility, real risk, funding-cycle dependent</li>
  <li><strong>Public sector and academia-adjacent</strong> — core facilities, agencies, hospital research institutes</li>
</ul>
<h3>On cycles</h3>
<p>Hiring in small biotech tracks financing. When capital tightens, discovery roles disappear first and quality, manufacturing and regulatory roles hold up best, because a company that has stopped discovering still has to manufacture and report on the programmes already in the clinic or on the market. The protection is relative, not absolute: a pre-revenue company that fails to raise can cut every function at once.</p>
`,
      },
      {
        title: "Making the Transition",
        duration: 20,
        content: `
<h2>Making the Transition</h2>
<p>An academic record is evidence of capability, but it is not written in the language hiring managers read. Translation is most of the work.</p>
<h3>Translate the experience</h3>
<p>A thesis chapter becomes "designed and executed a twelve-month experimental programme, including method development and statistical analysis, delivering results that supported a peer-reviewed publication". The work did not change; the framing did.</p>
<h3>Name the transferable skills explicitly</h3>
<ul>
  <li>Method development and troubleshooting</li>
  <li>Documentation and record-keeping — closer to GMP thinking than most candidates realise</li>
  <li>Project planning under resource constraint</li>
  <li>Presenting technical results to non-specialists</li>
  <li>Supervising and training junior researchers</li>
</ul>
<h3>Realistic entry routes</h3>
<p>Contract organisations, quality control laboratories and manufacturing floors hire consistently and train deliberately. A first role in QC is not a demotion — it is the fastest way to acquire the regulated-environment experience that every subsequent posting asks for.</p>
<h3>The search itself</h3>
<p>Applications through a portal alone convert poorly. Informational conversations, sector associations and alumni networks account for a disproportionate share of successful placements. Ask for fifteen minutes and a specific question, not for a job.</p>
`,
      },
    ],
    quiz: {
      title: "Careers in Life Science — Knowledge Check",
      questions: [
        {
          text: "When financing tightens for small biotech, which roles typically hold up best?",
          options: [
            "Discovery research roles",
            "Quality, manufacturing and regulatory roles",
            "Business development roles",
            "All roles contract equally",
          ],
          correctAnswer: "Quality, manufacturing and regulatory roles",
          explanation:
            "A company that has paused discovery still has to manufacture and report on the programmes already in the clinic or on the market, so those functions are retained longest.",
        },
        {
          text: "Why does the course describe a first role in quality control as a strong entry route?",
          options: [
            "It requires no scientific training",
            "It is the highest-paid entry position",
            "It builds the regulated-environment experience later postings require",
            "It guarantees promotion to management",
          ],
          correctAnswer:
            "It builds the regulated-environment experience later postings require",
          explanation:
            "GMP experience is the qualification most subsequent roles ask for, and QC is one of the most accessible places to acquire it.",
        },
        {
          text: "Which function reviews batch records, manages deviations and makes the batch release decision?",
          options: ["Quality control", "Quality assurance", "Process development", "Regulatory affairs"],
          correctAnswer: "Quality assurance",
          explanation:
            "QC performs the testing; QA reviews documentation, manages deviations and makes the release decision.",
        },
      ],
    },
  },
  {
    code: "TA-CP-APX",
    title: "Company Profile: Apotex",
    description:
      "A profile of one of Canada's largest pharmaceutical manufacturers — what it makes, how a generic manufacturer differs from an innovator, and the kinds of roles it hires for.",
    topic: "Career Insights",
    provider: "Talent Accelerator",
    delivery: "Asynchronous",
    duration: 45,
    creditCost: 100,
    isSpecial: false,
    tags: ["employer profile", "generics", "manufacturing", "Toronto"],
    modules: [
      {
        title: "The Generic Manufacturing Model",
        duration: 22,
        content: `
<h2>The Generic Manufacturing Model</h2>
<p>Understanding a generic manufacturer means understanding a business built on cost, speed and regulatory precision rather than on discovery.</p>
<h3>What the business is</h3>
<p>A generic manufacturer produces medicines whose originator protections have run out — patents expired, invalidated or licensed, and the innovator's data protection period elapsed. There is no discovery programme and no clinical development programme in the innovator sense. The scientific challenge sits in formulation, manufacturing and the demonstration of bioequivalence.</p>
<h3>What drives success</h3>
<ul>
  <li><strong>Time to market</strong> — the first generic entrant captures disproportionate share</li>
  <li><strong>Cost of goods</strong> — margins are thin, so process efficiency is a survival trait</li>
  <li><strong>Regulatory execution</strong> — Canada grants generics no market exclusivity, so a deficient submission costs months of first-mover share</li>
  <li><strong>Supply reliability</strong> — health systems depend on continuity; shortages carry real consequences</li>
</ul>
<h3>Bioequivalence in brief</h3>
<p>Rather than repeating efficacy trials, a generic sponsor demonstrates that its product delivers the active ingredient into the bloodstream at a comparable rate and extent to the reference product. This is usually a pharmacokinetic study in healthy volunteers, assessed against defined statistical criteria — but patients are used where the drug cannot safely be given to healthy subjects, and locally acting products may rely on pharmacodynamic, clinical-endpoint or in vitro comparisons instead.</p>
`,
      },
      {
        title: "Functions and Roles",
        duration: 23,
        content: `
<h2>Functions and Roles</h2>
<p>A vertically integrated generic manufacturer runs formulation, manufacturing, packaging, quality and regulatory functions on the same sites, which makes it a broad employer of science graduates.</p>
<h3>Where graduates typically enter</h3>
<ul>
  <li><strong>Quality control analyst</strong> — HPLC, dissolution testing, stability programmes</li>
  <li><strong>Manufacturing associate</strong> — solid dose and sterile operations under GMP</li>
  <li><strong>Formulation scientist</strong> — developing a product that performs like the reference</li>
  <li><strong>Regulatory affairs associate</strong> — preparing Abbreviated New Drug Submissions (ANDS) for Health Canada</li>
  <li><strong>Validation specialist</strong> — qualifying equipment, processes and cleaning</li>
</ul>
<h3>What the environment asks of you</h3>
<p>Documentation discipline is not an administrative afterthought here; it is the product of record. Comfort with repetitive precision, shift patterns in manufacturing, and a low tolerance for improvisation are what distinguish people who thrive.</p>
<h3>Preparing an application</h3>
<p>Name the techniques you have actually run and at what scale. Evidence of working to a written procedure — even an academic SOP — reads well. Familiarity with the concept of a deviation and why it must be recorded rather than corrected quietly will separate you from most applicants.</p>
`,
      },
    ],
    quiz: {
      title: "Company Profile: Apotex — Knowledge Check",
      questions: [
        {
          text: "What does a generic sponsor demonstrate instead of repeating efficacy trials?",
          options: ["Non-inferiority", "Bioequivalence", "Superiority", "Dose proportionality"],
          correctAnswer: "Bioequivalence",
          explanation:
            "Bioequivalence studies show the generic delivers the active ingredient at a comparable rate and extent to the reference product.",
        },
        {
          text: "Why is time to market especially important for a generic manufacturer?",
          options: [
            "Regulators impose deadlines",
            "The first generic entrant captures disproportionate market share",
            "Patents expire on a fixed annual schedule",
            "Manufacturing capacity expires",
          ],
          correctAnswer:
            "The first generic entrant captures disproportionate market share",
          explanation:
            "Early entry secures share before further competitors erode price, so a delayed submission is directly costly.",
        },
        {
          text: "Which behaviour would be a warning sign in a GMP manufacturing environment?",
          options: [
            "Recording a deviation when a step goes wrong",
            "Following a written procedure exactly",
            "Quietly correcting an error without documenting it",
            "Escalating an unexpected result",
          ],
          correctAnswer: "Quietly correcting an error without documenting it",
          explanation:
            "Undocumented correction breaks the record of what actually happened and is a data-integrity failure.",
        },
      ],
    },
  },
  {
    code: "TA-CP-EUR",
    title: "Company Profile: Eurofins",
    description:
      "A profile of a global testing and laboratory-services network — what contract testing organisations do, why they hire in volume, and how a laboratory services career progresses.",
    topic: "Career Insights",
    provider: "Talent Accelerator",
    delivery: "Asynchronous",
    duration: 45,
    creditCost: 100,
    isSpecial: false,
    tags: ["employer profile", "contract testing", "laboratory", "analytical"],
    modules: [
      {
        title: "The Contract Testing Business",
        duration: 22,
        content: `
<h2>The Contract Testing Business</h2>
<p>Contract testing organisations sell analytical capacity and regulatory credibility. Clients send samples; the laboratory returns results that will withstand scrutiny.</p>
<h3>What gets tested</h3>
<ul>
  <li><strong>Pharmaceutical</strong> — raw material identity, release testing, stability studies, impurity profiling</li>
  <li><strong>Biopharmaceutical</strong> — potency, purity, host-cell protein, sterility and endotoxin</li>
  <li><strong>Food and environment</strong> — contaminants, residues, microbiology, water quality</li>
  <li><strong>Clinical</strong> — sample analysis supporting trials</li>
</ul>
<h3>Why the model works</h3>
<p>Maintaining an accredited laboratory with validated methods across many techniques is expensive. Most sponsors cannot justify that capacity in-house for every assay, so they buy it. The testing organisation's asset is its accreditation, its validated method library and its throughput.</p>
<h3>What that means for staff</h3>
<p>Work is organised around turnaround time and method adherence. You will run a defined method many times rather than develop a new one each week — and the discipline that builds is exactly what regulated employers later look for.</p>
`,
      },
      {
        title: "Progression in Laboratory Services",
        duration: 23,
        content: `
<h2>Progression in Laboratory Services</h2>
<p>Contract laboratories are among the most reliable entry points into the sector, and they have unusually legible career ladders.</p>
<h3>A typical path</h3>
<ul>
  <li><strong>Laboratory technician / analyst I</strong> — running established methods to SOP</li>
  <li><strong>Analyst II / senior analyst</strong> — troubleshooting, investigating out-of-specification results</li>
  <li><strong>Method development or validation scientist</strong> — developing and validating new methods</li>
  <li><strong>Team lead or study director</strong> — owning client studies end to end</li>
  <li><strong>Quality assurance or operations management</strong> — audits, accreditation, capacity</li>
</ul>
<h3>Skills that accelerate progression</h3>
<p>Chromatography — HPLC and UPLC in particular — plus mass spectrometry, are the most portable technical skills. Beyond technique, the people who move fastest are those who can write a clear investigation: what happened, what was ruled out, what the evidence supports.</p>
<h3>The realistic picture</h3>
<p>Volume testing is repetitive and deadline-driven, and first-year roles can feel narrow. The compensation is that you accumulate documented, auditable, regulated-environment experience faster than in almost any other setting.</p>
`,
      },
    ],
    quiz: {
      title: "Company Profile: Eurofins — Knowledge Check",
      questions: [
        {
          text: "What is the core asset a contract testing organisation sells?",
          options: [
            "Proprietary drug candidates",
            "Accreditation, validated methods and throughput",
            "Patent portfolios",
            "Clinical trial sites",
          ],
          correctAnswer: "Accreditation, validated methods and throughput",
          explanation:
            "Sponsors buy credible, accredited analytical capacity they cannot justify maintaining in-house for every assay.",
        },
        {
          text: "Which technical skills does the course identify as the most portable in laboratory services?",
          options: [
            "Cell culture and flow cytometry",
            "Chromatography and mass spectrometry",
            "Molecular cloning",
            "Bioinformatics",
          ],
          correctAnswer: "Chromatography and mass spectrometry",
          explanation:
            "HPLC/UPLC and MS underpin release, stability and impurity testing across pharmaceutical, food and environmental work.",
        },
        {
          text: "Beyond bench technique, what most accelerates progression?",
          options: [
            "Working longer hours",
            "Writing clear investigations of what happened and what the evidence supports",
            "Publishing papers",
            "Learning a second instrument vendor's software",
          ],
          correctAnswer:
            "Writing clear investigations of what happened and what the evidence supports",
          explanation:
            "Investigation writing is the skill that moves an analyst toward senior, validation and study-director roles.",
        },
      ],
    },
  },
  {
    code: "BTC-COM-201",
    title: "Commercializing a Biotech Innovation",
    description:
      "From laboratory result to a business someone will fund: intellectual property, market assessment, the Canadian funding landscape, and the questions investors and partners actually ask.",
    topic: "Business and Commercialization",
    provider: "BioTalent Canada",
    delivery: "Asynchronous",
    duration: 75,
    creditCost: 100,
    isSpecial: false,
    tags: ["commercialization", "intellectual property", "funding", "startups"],
    modules: [
      {
        title: "Protecting the Idea",
        duration: 25,
        content: `
<h2>Protecting the Idea</h2>
<p>In life sciences, the asset being financed is usually a legal right rather than a product. Investors fund the exclusivity, not the experiment.</p>
<h3>Forms of protection</h3>
<ul>
  <li><strong>Patents</strong> — twenty years from filing, in exchange for public disclosure. Requires novelty, inventive step and utility</li>
  <li><strong>Trade secrets</strong> — indefinite while secret; appropriate for manufacturing know-how that cannot be reverse-engineered</li>
  <li><strong>Regulatory exclusivity</strong> — data and market protection granted independently of patents</li>
  <li><strong>Trademarks</strong> — brand, not technology</li>
</ul>
<h3>The disclosure trap</h3>
<p>Public disclosure before filing can destroy patentability. A conference poster, a thesis deposited in a university repository, or a preprint all count. Canada and the United States allow a twelve-month grace period for the inventor's own disclosure, as do Japan, South Korea and Australia; Europe and China effectively do not. Canada's grace period runs from the Canadian or PCT filing date rather than the priority date, so an early provisional filed elsewhere does not preserve it. Filing before disclosing is the only safe habit.</p>
<h3>Who owns it</h3>
<p>University inventions are governed by institutional IP policy, which varies considerably across Canadian institutions. Establish ownership and the licensing route with the technology transfer office before building a company plan on top of it.</p>
`,
      },
      {
        title: "Assessing the Market",
        duration: 25,
        content: `
<h2>Assessing the Market</h2>
<p>A technically excellent innovation with no reimbursable market is a research project, not a business. The assessment has to be honest and early.</p>
<h3>The questions that matter</h3>
<ul>
  <li><strong>Whose problem is it?</strong> The patient, the clinician, the payer and the procurement officer are four different customers with four different criteria</li>
  <li><strong>What is the standard of care?</strong> Your comparator is what is used today, not what was used when the research started</li>
  <li><strong>Who pays?</strong> In Canada, public drug plans, hospital budgets and private insurers are distinct payers; public listing runs through one national reimbursement review (CDA-AMC, or INESSS in Quebec) and a pan-Canadian Pharmaceutical Alliance price negotiation before any province lists</li>
  <li><strong>What is the evidence bar?</strong> Regulatory approval establishes safety and efficacy; reimbursement demands comparative value on top of that</li>
</ul>
<h3>Sizing without fooling yourself</h3>
<p>Top-down sizing — a large disease prevalence multiplied by an assumed price — produces impressive numbers and poor decisions. Bottom-up sizing asks how many centres would adopt, how many eligible patients each treats annually, and what realistic penetration looks like in year three. The smaller number is the one worth planning against.</p>
`,
      },
      {
        title: "Funding the Path",
        duration: 25,
        content: `
<h2>Funding the Path</h2>
<p>Canadian life-sciences ventures typically assemble capital from several sources rather than a single round.</p>
<h3>Non-dilutive sources</h3>
<ul>
  <li><strong>NRC IRAP</strong> — advisory support and cost-shared funding for technical projects</li>
  <li><strong>SR&amp;ED</strong> — tax credits for eligible basic research, applied research and experimental development; refundable for Canadian-controlled private corporations, which is what makes it a meaningful cash-flow item</li>
  <li><strong>Federal and provincial programmes</strong> — sector and region-specific contribution agreements</li>
  <li><strong>Accelerators and incubators</strong> — space, mentorship, sometimes small convertible investment</li>
</ul>
<h3>Dilutive capital</h3>
<p>Angel investment and seed venture capital generally expect a defined technical milestone rather than a finished product: a demonstrated mechanism, a validated assay, an animal proof of concept. Later rounds are priced against clinical milestones.</p>
<h3>What partners and investors ask</h3>
<p>Expect to be pressed on four things: the strength and freedom-to-operate position of the IP, the regulatory pathway and its precedents, the specific next milestone the money buys, and whether the team has done this before. A crisp answer to "what does this round de-risk" is worth more than an elaborate market slide.</p>
`,
      },
    ],
    quiz: {
      title: "Commercializing a Biotech Innovation — Knowledge Check",
      questions: [
        {
          text: "A researcher presents unpublished results on a conference poster before filing a patent application. What is the risk?",
          options: [
            "No risk — posters are not publications",
            "Public disclosure may destroy patentability in jurisdictions without a grace period",
            "The patent term is shortened by one year",
            "Only trademark protection is affected",
          ],
          correctAnswer:
            "Public disclosure may destroy patentability in jurisdictions without a grace period",
          explanation:
            "Canada and the US offer a twelve-month grace period for the inventor's own disclosure, as do Japan, South Korea and Australia; Europe and China effectively do not, so filing first is the safe habit.",
        },
        {
          text: "Why does the course prefer bottom-up market sizing?",
          options: [
            "It always produces larger numbers",
            "It is required by investors",
            "It is grounded in adoption and eligible patients rather than prevalence times price",
            "It avoids the need for a comparator",
          ],
          correctAnswer:
            "It is grounded in adoption and eligible patients rather than prevalence times price",
          explanation:
            "Top-down sizing produces impressive but unreliable figures; bottom-up forces explicit assumptions about adoption and penetration.",
        },
        {
          text: "Which form of protection is most appropriate for manufacturing know-how that cannot be reverse-engineered?",
          options: ["Patent", "Trademark", "Trade secret", "Regulatory exclusivity"],
          correctAnswer: "Trade secret",
          explanation:
            "A trade secret lasts indefinitely while secrecy holds and avoids the public disclosure a patent requires.",
        },
      ],
    },
  },
  {
    code: "CST-CT-201",
    title: "Clinical Trials: Design, Conduct and Oversight",
    description:
      "How a clinical trial is structured, who is accountable for what, and the Good Clinical Practice obligations that govern participant safety and data reliability.",
    topic: "Clinical Trials",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 75,
    creditCost: 100,
    isSpecial: false,
    tags: ["clinical trials", "GCP", "ICH", "monitoring"],
    modules: [
      {
        title: "Phases and Design",
        duration: 25,
        content: `
<h2>Phases and Design</h2>
<p>Trial phases describe intent, not merely sequence. Each answers a distinct question, and design follows from the question.</p>
<h3>The phases</h3>
<ul>
  <li><strong>Phase I</strong> — safety, tolerability and pharmacokinetics, usually in a small number of healthy volunteers; in oncology, in patients</li>
  <li><strong>Phase II</strong> — preliminary efficacy and dose finding in the target population</li>
  <li><strong>Phase III</strong> — confirmatory efficacy and safety against a comparator, powered for a defined endpoint</li>
  <li><strong>Phase IV</strong> — post-authorisation studies, including long-term safety</li>
</ul>
<h3>Design features that protect the answer</h3>
<ul>
  <li><strong>Randomisation</strong> — removes allocation bias and balances unknown confounders in expectation</li>
  <li><strong>Blinding</strong> — protects against differential assessment and reporting</li>
  <li><strong>A pre-specified primary endpoint</strong> — fixed in the protocol before the trial begins, so the analysis cannot be steered by the data</li>
  <li><strong>Adequate power</strong> — an underpowered trial risks a false negative on an effective treatment</li>
</ul>
<h3>Equipoise</h3>
<p>A randomised trial is only ethical where genuine uncertainty exists within the expert clinical community about which arm is superior — an individual investigator's own preference for one arm does not defeat it. Where the answer is already known, randomisation cannot be justified.</p>
`,
      },
      {
        title: "Roles and Accountability",
        duration: 25,
        content: `
<h2>Roles and Accountability</h2>
<p>Good Clinical Practice allocates responsibilities precisely, and a great deal of trial trouble comes from those boundaries being blurred.</p>
<h3>The parties</h3>
<ul>
  <li><strong>Sponsor</strong> — initiates and finances the trial; accountable for design, safety reporting and oversight, including of anything delegated</li>
  <li><strong>Investigator</strong> — responsible for the conduct of the trial at their site and for the medical care of participants</li>
  <li><strong>Research ethics board</strong> — independent review and ongoing oversight; approves the protocol and consent materials</li>
  <li><strong>Monitor / CRA</strong> — verifies that conduct, records and reporting match the protocol and the regulations</li>
  <li><strong>Regulatory authority</strong> — Health Canada authorises the trial and may inspect it</li>
</ul>
<h3>Delegation does not transfer accountability</h3>
<p>A sponsor may contract a CRO to run the trial, but remains accountable for it. Similarly, an investigator may delegate tasks to qualified site staff, recorded on a delegation log, while retaining responsibility for the conduct of the trial.</p>
<h3>Informed consent</h3>
<p>Consent is a process, not a signature. It must precede any trial-specific procedure, be given without coercion, use language the participant understands, and be re-taken when new information materially affects the participant's decision.</p>
`,
      },
      {
        title: "Data, Deviations and Safety Reporting",
        duration: 25,
        content: `
<h2>Data, Deviations and Safety Reporting</h2>
<p>The credibility of a trial rests on whether its records can be reconstructed and trusted.</p>
<h3>Source data</h3>
<p>Source data is the first recording of an observation. It must be attributable, legible, contemporaneous, original and accurate. Corrections are made by striking through, initialling and dating — never by obliterating the original entry.</p>
<h3>Protocol deviations</h3>
<p>A deviation is any departure from the approved protocol. It is recorded, assessed for impact on participant safety and data integrity, and reported according to its significance. Deviations that recur call for root-cause analysis rather than assumption: the cause may be an impractical protocol, or it may be a gap in site training, staffing or delegation, and the corrective action differs accordingly.</p>
<h3>Safety reporting</h3>
<ul>
  <li><strong>Adverse event</strong> — any untoward medical occurrence in a participant, whether or not related to the treatment</li>
  <li><strong>Serious adverse event</strong> — results in death, is life-threatening, requires or prolongs hospitalisation, causes persistent disability, or is a congenital anomaly; and, on medical judgement, any other important medical event that may jeopardise the participant or require intervention to prevent one of those outcomes</li>
  <li><strong>SUSAR</strong> — a serious, unexpected reaction judged related to the investigational product; subject to expedited reporting timelines</li>
</ul>
<p>Expedited timelines are short — fatal or life-threatening SUSARs in days, not weeks — and missing them is among the most consequential compliance failures a trial can have.</p>
`,
      },
    ],
    quiz: {
      title: "Clinical Trials — Knowledge Check",
      questions: [
        {
          text: "A sponsor contracts a CRO to conduct its trial. Who remains accountable for trial oversight?",
          options: ["The CRO", "The sponsor", "The investigator", "The research ethics board"],
          correctAnswer: "The sponsor",
          explanation:
            "Under GCP, a sponsor may delegate trial-related duties but retains accountability for them.",
        },
        {
          text: "Why must the primary endpoint be pre-specified?",
          options: [
            "To satisfy the ethics board's paperwork",
            "So the analysis cannot be steered by looking at the data first",
            "Because regulators publish endpoints in advance",
            "To allow the trial to be stopped early",
          ],
          correctAnswer:
            "So the analysis cannot be steered by looking at the data first",
          explanation:
            "Choosing an endpoint after seeing results invalidates the statistical inference; pre-specification preserves it.",
        },
        {
          text: "How should an error in a paper source document be corrected?",
          options: [
            "Obliterate the entry and write the correct value",
            "Use correction fluid and re-enter",
            "Strike through, write the correction, initial and date",
            "Discard the page and start again",
          ],
          correctAnswer: "Strike through, write the correction, initial and date",
          explanation:
            "The original entry must remain legible so the record of what was first written is preserved.",
        },
        {
          text: "What distinguishes a SUSAR from other serious adverse events?",
          options: [
            "It occurred in the control arm",
            "It is serious, unexpected and judged related to the investigational product",
            "It was reported by the participant rather than the investigator",
            "It occurred after the trial ended",
          ],
          correctAnswer:
            "It is serious, unexpected and judged related to the investigational product",
          explanation:
            "All three conditions must hold, and SUSARs carry expedited reporting timelines.",
        },
      ],
    },
  },
  {
    code: "CST-RA-201",
    title: "Regulatory Affairs in Canada: Health Canada Essentials",
    description:
      "How therapeutic products are regulated in Canada — the directorates, the submission types, the review process, and the post-market obligations that follow authorisation.",
    topic: "Regulatory Affairs",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 75,
    creditCost: 100,
    isSpecial: false,
    tags: ["regulatory affairs", "Health Canada", "submissions", "compliance"],
    modules: [
      {
        title: "The Canadian Regulatory Landscape",
        duration: 25,
        content: `
<h2>The Canadian Regulatory Landscape</h2>
<p>Health Canada regulates therapeutic products under the Food and Drugs Act and its regulations. Knowing which branch reviews what saves a great deal of misdirected effort.</p>
<h3>Who reviews what</h3>
<ul>
  <li><strong>Pharmaceutical Drugs Directorate</strong> — pharmaceutical drugs (renamed from the Therapeutic Products Directorate in 2022)</li>
  <li><strong>Medical Devices Directorate</strong> — medical devices for human use</li>
  <li><strong>Biologic and Radiopharmaceutical Drugs Directorate</strong> — biologics, vaccines, blood products, cell and gene therapies</li>
  <li><strong>Natural and Non-prescription Health Products Directorate</strong> — natural health products and over-the-counter medicines</li>
  <li><strong>Regulatory Operations and Enforcement Branch</strong> — inspection, licensing and compliance</li>
</ul>
<h3>Authorisation instruments</h3>
<ul>
  <li><strong>Notice of Compliance</strong> — market authorisation for a drug</li>
  <li><strong>Drug Identification Number</strong> — issued on authorisation, identifies the product</li>
  <li><strong>Establishment Licence</strong> — authorises a site to fabricate, package, test or import</li>
  <li><strong>No Objection Letter</strong> — Health Canada's authorisation to begin a trial, issued in response to a Clinical Trial Application</li>
</ul>
<h3>Approval is not access</h3>
<p>A Notice of Compliance permits sale. It does not secure reimbursement. Health technology assessment and pricing negotiation are separate processes with separate evidence expectations, and planning for them starts long before approval.</p>
`,
      },
      {
        title: "Submissions and the Common Technical Document",
        duration: 25,
        content: `
<h2>Submissions and the Common Technical Document</h2>
<p>Canada uses the ICH Common Technical Document structure, so a submission's architecture is broadly portable across major jurisdictions.</p>
<h3>The five modules</h3>
<ul>
  <li><strong>Module 1</strong> — region-specific administrative information; the only module unique to Canada</li>
  <li><strong>Module 2</strong> — summaries and overviews, where the argument is actually made</li>
  <li><strong>Module 3</strong> — quality: manufacture, control, stability</li>
  <li><strong>Module 4</strong> — non-clinical study reports</li>
  <li><strong>Module 5</strong> — clinical study reports</li>
</ul>
<h3>Submission types</h3>
<p>A New Drug Submission covers a drug not yet authorised in Canada — a new active ingredient, combination, dosage form or route of administration. An Abbreviated New Drug Submission relies on demonstrated bioequivalence to a Canadian reference product. A Supplement covers a change to an already-authorised product, including a new indication. Notifiable changes and annual notifications handle lower-risk changes without a full supplement.</p>
<h3>The review cycle</h3>
<p>Submissions pass a screening stage before substantive review. Deficiencies raised during review arrive as a Notice of Deficiency or, near the end, a Notice of Non-Compliance. Responding well means answering the question asked, with data, rather than restating the original position more forcefully.</p>
`,
      },
      {
        title: "After Authorisation",
        duration: 25,
        content: `
<h2>After Authorisation</h2>
<p>Regulatory work does not end at approval; the majority of a regulatory professional's career is spent on products already on the market.</p>
<h3>Ongoing obligations</h3>
<ul>
  <li><strong>Pharmacovigilance</strong> — collecting, assessing and reporting adverse reactions; annual summary reports, prepared each year and submitted to Health Canada on request</li>
  <li><strong>Labelling maintenance</strong> — keeping the product monograph current as evidence accumulates</li>
  <li><strong>Change management</strong> — assessing every manufacturing or specification change for its regulatory reporting category</li>
  <li><strong>Shortage reporting</strong> — anticipated and actual shortages must be reported publicly</li>
  <li><strong>Recalls</strong> — classified by health risk, with defined notification and effectiveness-check obligations</li>
</ul>
<h3>Where regulatory sits in the organisation</h3>
<p>Regulatory affairs translates between science, manufacturing, quality and the agency. The function's value lies in raising the reporting consequences of a proposed change before it is made, not in documenting it afterwards. A regulatory professional who is consulted late is being used as a filing clerk rather than an adviser.</p>
`,
      },
    ],
    quiz: {
      title: "Regulatory Affairs in Canada — Knowledge Check",
      questions: [
        {
          text: "Which CTD module is specific to Canada rather than common across ICH regions?",
          options: ["Module 1", "Module 2", "Module 3", "Module 5"],
          correctAnswer: "Module 1",
          explanation:
            "Module 1 holds region-specific administrative content; Modules 2 through 5 follow the common structure.",
        },
        {
          text: "A company receives a Notice of Compliance for its product. What does this secure?",
          options: [
            "Market authorisation and public reimbursement",
            "Market authorisation only",
            "Reimbursement only",
            "An establishment licence",
          ],
          correctAnswer: "Market authorisation only",
          explanation:
            "Reimbursement follows separate health technology assessment and pricing processes with their own evidence requirements.",
        },
        {
          text: "Which directorate reviews vaccines and cell and gene therapies?",
          options: [
            "Pharmaceutical Drugs Directorate",
            "Biologic and Radiopharmaceutical Drugs Directorate",
            "Natural and Non-prescription Health Products Directorate",
            "Regulatory Operations and Enforcement Branch",
          ],
          correctAnswer: "Biologic and Radiopharmaceutical Drugs Directorate",
          explanation:
            "BRDD handles biologics, vaccines, blood products and cell and gene therapies.",
        },
      ],
    },
  },
];

/**
 * Modules and the assessment are rebuilt only when their content has
 * actually changed. A no-op re-run therefore leaves module progress and
 * quiz attempts intact; a content change drops them, because the rows
 * they point at no longer describe the same material.
 */
function modulesMatch(
  existing: { title: string; content: string | null; duration: number | null }[],
  desired: SeedModule[]
): boolean {
  if (existing.length !== desired.length) return false;
  return desired.every(
    (m, i) =>
      existing[i].title === m.title &&
      existing[i].content === m.content.trim() &&
      existing[i].duration === m.duration
  );
}

async function seedCourse(c: SeedCourse, index: number, instructorId: string | null) {
  const existing = await prisma.course.findFirst({ where: { code: c.code } });

  const data = {
    code: c.code,
    title: c.title,
    description: c.description,
    category: c.topic,
    topic: c.topic,
    provider: c.provider,
    delivery: c.delivery,
    tags: JSON.stringify(c.tags),
    courseType: "content",
    status: "published",
    passingScore: 75,
    maxAttempts: 0,
    duration: c.duration,
    creditCost: c.creditCost,
    isSpecial: c.isSpecial,
    requiresApproval: false,
    displayOrder: index,
    instructorId,
  };

  const course = existing
    ? await prisma.course.update({ where: { id: existing.id }, data })
    : await prisma.course.create({ data });

  const currentModules = await prisma.module.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" },
    select: { title: true, content: true, duration: true },
  });

  let moduleAction = "unchanged";
  if (!modulesMatch(currentModules, c.modules)) {
    await prisma.module.deleteMany({ where: { courseId: course.id } });
    for (let i = 0; i < c.modules.length; i++) {
      const m = c.modules[i];
      await prisma.module.create({
        data: {
          courseId: course.id,
          title: m.title,
          type: "content",
          content: m.content.trim(),
          duration: m.duration,
          order: i + 1,
          isRequired: true,
        },
      });
    }
    moduleAction = currentModules.length === 0 ? "created" : "rebuilt";
  }

  const currentAssessment = await prisma.assessment.findFirst({
    where: { courseId: course.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const assessmentMatches =
    currentAssessment !== null &&
    currentAssessment.title === c.quiz.title &&
    currentAssessment.questions.length === c.quiz.questions.length &&
    c.quiz.questions.every(
      (q, i) =>
        currentAssessment.questions[i].text === q.text &&
        currentAssessment.questions[i].correctAnswer === q.correctAnswer &&
        currentAssessment.questions[i].explanation === q.explanation &&
        currentAssessment.questions[i].options === JSON.stringify(q.options)
    );

  let quizAction = "unchanged";
  if (!assessmentMatches) {
    await prisma.assessment.deleteMany({ where: { courseId: course.id } });
    await prisma.assessment.create({
      data: {
        courseId: course.id,
        title: c.quiz.title,
        description: `Check your understanding of ${c.title}.`,
        passingScore: 75,
        maxAttempts: 0,
        shuffleQ: true,
        questions: {
          create: c.quiz.questions.map((q, i) => ({
            text: q.text,
            type: "multiple_choice",
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            points: 1,
            order: i + 1,
            explanation: q.explanation,
            topic: c.topic,
          })),
        },
      },
    });
    quizAction = currentAssessment === null ? "created" : "rebuilt";
  }

  return { action: existing ? "updated" : "created", moduleAction, quizAction };
}

async function main() {
  const seen = new Set<string>();
  for (const c of COURSES) {
    if (seen.has(c.code)) throw new Error(`Duplicate course code in seed: ${c.code}`);
    seen.add(c.code);
    for (const q of c.quiz.questions) {
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(`${c.code}: correctAnswer is not one of the options — "${q.text}"`);
      }
      if (q.options.length !== new Set(q.options).size) {
        throw new Error(`${c.code}: duplicate options — "${q.text}"`);
      }
    }
    const total = c.modules.reduce((n, m) => n + m.duration, 0);
    if (total !== c.duration) {
      throw new Error(`${c.code}: module durations sum to ${total}, course duration is ${c.duration}`);
    }
  }

  const instructor =
    (await prisma.user.findFirst({ where: { role: "admin" } })) ??
    (await prisma.user.findFirst({ where: { role: "superadmin" } }));
  if (!instructor) {
    console.warn("No admin user found — courses will be seeded without an instructor.");
  }

  console.log(`Seeding ${COURSES.length} catalogue courses…`);
  for (let i = 0; i < COURSES.length; i++) {
    const c = COURSES[i];
    const r = await seedCourse(c, i, instructor?.id ?? null);
    console.log(
      `  ${c.code.padEnd(13)} ${r.action.padEnd(8)} modules:${r.moduleAction.padEnd(10)} quiz:${r.quizAction.padEnd(10)} ${c.title}`
    );
  }

  const published = await prisma.course.count({ where: { status: "published" } });
  const byTopic = await prisma.course.groupBy({
    by: ["topic"],
    where: { status: "published" },
    _count: { _all: true },
  });
  console.log(`\nPublished courses in catalogue: ${published}`);
  for (const t of byTopic.sort((a, b) => (a.topic ?? "").localeCompare(b.topic ?? ""))) {
    console.log(`  ${String(t._count._all).padStart(2)}  ${t.topic ?? "(no topic)"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
