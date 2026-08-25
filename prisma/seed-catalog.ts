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
            "The model must be retrained before every batch",
            "Nothing — the model is a decision-support tool and sits outside the quality system",
            "The model forms part of the validated state of the system and is subject to change control",
            "Only the final human decision needs documenting",
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
            "They pair domain knowledge with technical fluency, which is scarce",
            "They are less exposed to changes in regulatory expectations",
            "They typically pay more than pure research roles",
            "They require less specialist training to enter",
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
            "OT systems are not connected to any network",
            "Regulators prohibit patching",
            "Patches are not available for industrial systems",
            "Patching may invalidate equipment qualification",
          ],
          correctAnswer: "Patching may invalidate equipment qualification",
          explanation:
            "Qualified equipment operates in a validated state; a change such as a patch can require requalification, so patches are often deferred or batched.",
        },
        {
          text: "Which control does the course identify as the highest-value structural defence for OT environments?",
          options: ["Annual security training", "Antivirus on every instrument", "Network segmentation", "Longer passwords"],
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
            "They provide a softer route into larger, better-defended partners",
            "They are exempt from data protection law",
            "They hold no valuable data of their own",
            "They are legally easier to attack",
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
            "Business development roles",
            "All roles contract equally",
            "Discovery research roles",
            "Quality, manufacturing and regulatory roles",
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
          options: ["Bioequivalence", "Superiority", "Dose proportionality", "Non-inferiority"],
          correctAnswer: "Bioequivalence",
          explanation:
            "Bioequivalence studies show the generic delivers the active ingredient at a comparable rate and extent to the reference product.",
        },
        {
          text: "Why is time to market especially important for a generic manufacturer?",
          options: [
            "Patents expire on a fixed annual schedule",
            "Manufacturing capacity expires",
            "Regulators impose deadlines",
            "The first generic entrant captures disproportionate market share",
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
            "Chromatography and mass spectrometry",
            "Molecular cloning",
            "Bioinformatics",
            "Cell culture and flow cytometry",
          ],
          correctAnswer: "Chromatography and mass spectrometry",
          explanation:
            "HPLC/UPLC and MS underpin release, stability and impurity testing across pharmaceutical, food and environmental work.",
        },
        {
          text: "Beyond bench technique, what most accelerates progression?",
          options: [
            "Publishing papers",
            "Learning a second instrument vendor's software",
            "Working longer hours",
            "Writing clear investigations of what happened and what the evidence supports",
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
            "Only trademark protection is affected",
            "No risk — posters are not publications",
            "Public disclosure may destroy patentability in jurisdictions without a grace period",
            "The patent term is shortened by one year",
          ],
          correctAnswer:
            "Public disclosure may destroy patentability in jurisdictions without a grace period",
          explanation:
            "Canada and the US offer a twelve-month grace period for the inventor's own disclosure, as do Japan, South Korea and Australia; Europe and China effectively do not, so filing first is the safe habit.",
        },
        {
          text: "Why does the course prefer bottom-up market sizing?",
          options: [
            "It is required by investors",
            "It is grounded in adoption and eligible patients rather than prevalence times price",
            "It avoids the need for a comparator",
            "It always produces larger numbers",
          ],
          correctAnswer:
            "It is grounded in adoption and eligible patients rather than prevalence times price",
          explanation:
            "Top-down sizing produces impressive but unreliable figures; bottom-up forces explicit assumptions about adoption and penetration.",
        },
        {
          text: "Which form of protection is most appropriate for manufacturing know-how that cannot be reverse-engineered?",
          options: ["Trade secret", "Regulatory exclusivity", "Patent", "Trademark"],
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
          options: ["The investigator", "The research ethics board", "The CRO", "The sponsor"],
          correctAnswer: "The sponsor",
          explanation:
            "Under GCP, a sponsor may delegate trial-related duties but retains accountability for them.",
        },
        {
          text: "Why must the primary endpoint be pre-specified?",
          options: [
            "To allow the trial to be stopped early",
            "To satisfy the ethics board's paperwork",
            "So the analysis cannot be steered by looking at the data first",
            "Because regulators publish endpoints in advance",
          ],
          correctAnswer:
            "So the analysis cannot be steered by looking at the data first",
          explanation:
            "Choosing an endpoint after seeing results invalidates the statistical inference; pre-specification preserves it.",
        },
        {
          text: "How should an error in a paper source document be corrected?",
          options: [
            "Use correction fluid and re-enter",
            "Strike through, write the correction, initial and date",
            "Discard the page and start again",
            "Obliterate the entry and write the correct value",
          ],
          correctAnswer: "Strike through, write the correction, initial and date",
          explanation:
            "The original entry must remain legible so the record of what was first written is preserved.",
        },
        {
          text: "What distinguishes a SUSAR from other serious adverse events?",
          options: [
            "It is serious, unexpected and judged related to the investigational product",
            "It was reported by the participant rather than the investigator",
            "It occurred after the trial ended",
            "It occurred in the control arm",
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
            "Reimbursement only",
            "An establishment licence",
            "Market authorisation and public reimbursement",
            "Market authorisation only",
          ],
          correctAnswer: "Market authorisation only",
          explanation:
            "Reimbursement follows separate health technology assessment and pricing processes with their own evidence requirements.",
        },
        {
          text: "Which directorate reviews vaccines and cell and gene therapies?",
          options: [
            "Regulatory Operations and Enforcement Branch",
            "Pharmaceutical Drugs Directorate",
            "Biologic and Radiopharmaceutical Drugs Directorate",
            "Natural and Non-prescription Health Products Directorate",
          ],
          correctAnswer: "Biologic and Radiopharmaceutical Drugs Directorate",
          explanation:
            "BRDD handles biologics, vaccines, blood products and cell and gene therapies.",
        },
      ],
    },
  },
  {
    code: "CST-GMP-101",
    title: "Good Manufacturing Practices (GMP) Fundamentals",
    description:
      "This course explains how Good Manufacturing Practices govern drug fabrication in Canada under Division 2 of the Food and Drug Regulations. Learners will be able to identify the quality system elements, read an executed batch record, and explain what an Establishment Licence permits.",
    topic: "Industry Fundamentals (GxPs)",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 75,
    creditCost: 100,
    isSpecial: false,
    tags: ["gmp", "health canada", "division 2", "quality systems", "validation", "batch records"],
    modules: [
      {
        title: "What GMP Is and Where It Comes From in Canada",
        duration: 25,
        content: `
<h2>What GMP Is and Where It Comes From in Canada</h2><p>Good Manufacturing Practices are the minimum conditions under which a drug may be fabricated, packaged, labelled, tested, stored and distributed so that every unit reaching a patient is what the label says it is. GMP exists because quality cannot be tested into a product. A finished-product assay examines a handful of units drawn from a batch of hundreds of thousands; it will not detect a mix-up in one drum of excipient, a cross-contaminated hopper, or a label reel loaded the wrong way round on the night shift. Quality is built into the process and demonstrated by the record.</p><h3>The principles underneath the rules</h3><p>Every GMP clause traces back to a short list of ideas: define the process before you run it, control the variables that matter, keep premises clean and personnel trained, separate the people who judge quality from the people under pressure to ship, and record what happened as it happens. The two failure modes the whole system exists to prevent are contamination - something in the product that should not be there - and mix-up - the wrong product, the wrong strength or the wrong label. Nearly every requirement can be placed under one of those two headings.</p><h3>Division 2 of the Food and Drug Regulations</h3><p>In Canada the legal requirement sits in Division 2 of Part C of the Food and Drug Regulations. It is deliberately short and written as outcomes rather than methods, covering premises, equipment, personnel, sanitation, raw material testing, manufacturing control, the quality control department, packaging material and finished product testing, records, samples and stability. Health Canada's interpretation of each section is published in the Good Manufacturing Practices Guide for Drug Products, GUI-0001 - the interpretation an inspector applies when writing an observation.</p><h3>The Establishment Licence</h3><p>Compliance is enforced through licensing. A Drug Establishment Licence is required to fabricate, package or label, test, import, distribute or wholesale a drug in Canada. The licence is issued to a company and lists every activity, dosage form and drug category permitted at each building it names, together with any foreign sites an importer relies on. It is not a product authorisation - that is the Drug Identification Number. Holders confirm their details each year through the Annual Licence Review, and a change of activity, building or foreign site requires an amendment before that work begins.</p>
`,
      },
      {
        title: "The Quality System Elements",
        duration: 30,
        content: `
<h2>The Quality System Elements</h2><p>Division 2 reads as a set of interlocking systems rather than a checklist. Each one produces evidence, and an inspection is largely the exercise of asking whether that evidence exists and whether it agrees with what operators actually do on the floor.</p><h3>Premises, equipment and personnel</h3><p>Premises must be designed and maintained so that operations can be performed cleanly and without mix-up: defined material and personnel flows, air handling with pressure differentials appropriate to the dosage form, and dedicated, physically separated facilities for penicillins and other highly sensitising products. Equipment must be of suitable construction, calibrated on a schedule, maintained, and either dedicated or cleaned by a validated procedure. The equipment logbook recording use, cleaning and maintenance is examined at nearly every inspection. Personnel requirements are easy to state and hard to sustain: enough staff with the education, training and experience for the task, trained on the procedures they actually perform, with that training documented before the work is done.</p><h3>Documentation and production</h3><p>Production runs against an approved master formula. Each batch is manufactured, packaged and controlled according to that master, and any departure becomes a deviation to be investigated and closed before release. Written procedures cover sanitation, cleaning, calibration, in-process controls and change control. Raw materials are tested and packaging materials examined or tested against specifications before use, and each finished lot is tested before it is made available for sale or for further use in fabrication.</p><h3>Quality control</h3><p>The quality control department must be independent of production and led by a person with appropriate training and experience. It approves specifications, methods and procedures, and it - not production, not planning - releases each lot for sale. That independence is the structural heart of Division 2, because it removes the release decision from the person carrying the shipping date.</p><h3>Complaints, recalls and self-inspection</h3><p>Every complaint is recorded, assessed for a possible quality defect and investigated, with trends reviewed rather than each case treated in isolation. Distribution records must be complete enough to trace and recall a lot quickly; Health Canada classifies recalls by health risk, from Type I, where use could cause serious harm or death, through to Type III, where harm is unlikely. Self-inspection closes the loop: a scheduled internal audit programme that finds the gaps before an inspector does, with findings written down and corrective actions tracked to completion.</p>
`,
      },
      {
        title: "Validation, Qualification and the Batch Record",
        duration: 20,
        content: `
<h2>Validation, Qualification and the Batch Record</h2><p>Validation is documented evidence that a process, method or system does what it is supposed to do, reproducibly. Qualification is the same idea applied to facilities, utilities and equipment. The order matters in practice: you qualify the equipment before you validate the process that runs on it.</p><h3>Installation, operational and performance qualification</h3><p>Installation qualification confirms that the equipment as delivered matches its specification and drawings - correct model and serial number, the right materials of construction, utilities connected, instruments calibrated, manuals and spare parts on hand. Operational qualification confirms that it works across the full range of intended operating parameters, deliberately including the worst-case limits, and that alarms, interlocks and failure modes behave as designed. Performance qualification confirms that it performs consistently under real production conditions: actual materials, trained operators, approved procedures, normal run lengths. A tablet press whose operational qualification ran on placebo is not qualified for a cohesive granulation until performance qualification says so.</p><h3>Process validation</h3><p>Process validation demonstrates that the commercial process reliably yields product meeting its specifications. Current practice treats it as a lifecycle: design the process and understand its critical parameters, qualify it at commercial scale over a defined number of consecutive successful batches, then verify performance continuously through trending in routine production. Validation is never a one-time event - a change of supplier, component, equipment or parameter reopens the question through change control.</p><h3>The batch record is the product of record</h3><p>The executed batch record is the single document saying a specific lot was made correctly. It carries the materials and their lot numbers, the equipment used, in-process results, yields at each stage, the label reconciliation, deviations and their dispositions, and the signatures of those who performed and verified each critical step. Once the lot ships, the record is what remains, and it is retained for one year past that lot's expiry date.</p><h3>If it is not documented it did not happen</h3><p>Entries are made at the time the work is done, by the person who did it. An entry is corrected with a single stroke through the original, initialled and dated, with a reason - never an overwrite, never a rewritten page. Recording a line clearance an hour afterwards, or signing for a step someone else performed, is a data integrity deviation even when the work was done properly, because the record has stopped being evidence.</p>
`,
      },
    ],
    quiz: {
      title: "Good Manufacturing Practices (GMP) Fundamentals - Knowledge Check",
      questions: [
        {
          text: "Under Canada's Food and Drug Regulations, what is the difference between a Drug Establishment Licence and a Drug Identification Number?",
          options: [
            "The Establishment Licence authorises a company to carry out specified activities at named buildings; the Drug Identification Number authorises a specific product for sale",
            "The Establishment Licence authorises a specific product for sale; the Drug Identification Number authorises a company to carry out specified activities at named buildings",
            "Both are issued against the product, the licence covering the domestic market and the number covering export",
            "The Establishment Licence replaces the need for a Drug Identification Number once GMP compliance has been demonstrated",
          ],
          correctAnswer: "The Establishment Licence authorises a company to carry out specified activities at named buildings; the Drug Identification Number authorises a specific product for sale",
          explanation: "The Establishment Licence is issued to a company and lists each permitted activity, dosage form and drug category at every building it names, while the Drug Identification Number is the market authorisation attached to a particular product.",
        },
        {
          text: "An autoclave has been installed and the team has verified that it holds each programmed sterilisation temperature across the full range of intended settings, including the worst-case low limit, and that the low-temperature alarm triggers correctly. Which stage does this describe?",
          options: [
            "Installation qualification",
            "Operational qualification",
            "Performance qualification",
            "Continued process verification",
          ],
          correctAnswer: "Operational qualification",
          explanation: "Operational qualification challenges the equipment across its intended operating range, including worst-case limits, alarms and interlocks. Installation qualification only confirms the unit as delivered and connected; performance qualification uses real production loads.",
        },
        {
          text: "A production manager asks to be given authority to release finished lots for sale in order to shorten cycle time. Why can this not be granted under Division 2?",
          options: [
            "Lot release must be performed by the quality control department, which is required to be independent of production",
            "Lot release must be performed by a Health Canada inspector before each lot ships",
            "Lot release may only be performed by the holder of the Drug Identification Number",
            "Lot release must be performed by the contract laboratory that ran the finished-product testing",
          ],
          correctAnswer: "Lot release must be performed by the quality control department, which is required to be independent of production",
          explanation: "Division 2 requires a quality control department that is separate from production and that approves or rejects each lot, keeping the release decision away from the people carrying the shipping schedule.",
        },
        {
          text: "An operator performs a line clearance correctly but records it in the batch record an hour later, at the end of the shift. How should this be characterised?",
          options: [
            "Acceptable, because the line clearance was in fact performed as required",
            "Acceptable, provided the operator initials and dates the late entry",
            "A data integrity deviation, because the entry is not contemporaneous, and it must be raised and investigated",
            "Relevant only if the lot subsequently fails finished-product testing",
          ],
          correctAnswer: "A data integrity deviation, because the entry is not contemporaneous, and it must be raised and investigated",
          explanation: "Entries must be made at the time the work is done by the person who did it. A back-filled entry is no longer evidence of what happened, which is why late recording is treated as a deviation regardless of the outcome of the batch.",
        },
      ],
    },
  },
  {
    code: "CST-GDP-101",
    title: "Good Documentation Practices and Data Integrity",
    description:
      "You will learn to apply ALCOA+ to paper, electronic and hybrid records, make and correct entries the way an inspector expects, and review audit trails for GMP-relevant changes. The course also covers the data integrity failures regulators cite most often.",
    topic: "Industry Fundamentals (GxPs)",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["alcoa+", "data integrity", "documentation", "audit trail", "gmp"],
    modules: [
      {
        title: "ALCOA+ and the Data Lifecycle",
        duration: 18,
        content: `
<h2>ALCOA+ and the Data Lifecycle</h2>
<p>Regulators do not inspect your product. They inspect the records that describe it, and if those records cannot be trusted then neither can the batch behind them, whatever the certificate of analysis says. ALCOA is the shorthand for what a trustworthy record looks like. It is usually credited to Stan Woollen at the FDA in the 1990s and now sits at the centre of every modern data integrity guidance, including PIC/S PI 041 and the expectations Health Canada applies under Part C, Division 2 of the Food and Drug Regulations.</p>
<h3>The original five</h3>
<ul>
<li><strong>Attributable</strong> - every entry traces to the person who made it and the moment they made it. On paper that means initials and date against a maintained signature log; in a system it means a unique user ID belonging to one human being.</li>
<li><strong>Legible</strong> - readable now and for the whole retention period. Health Canada expects most fabrication and testing records to be kept for one year past the lot expiry date, so a thermal printout that fades in two years fails this test.</li>
<li><strong>Contemporaneous</strong> - recorded as the activity happens. Writing balance readings on a glove or a scrap of paper and transcribing them at the end of the shift is among the most common paper findings.</li>
<li><strong>Original</strong> - the first capture of the observation, or a certified true copy of it. For a chromatography data system the original is the electronic data file and its metadata, not the printed chromatogram.</li>
<li><strong>Accurate</strong> - true, complete and free of any editing that makes a number fit. Accuracy depends on calibrated instruments and verified calculations as much as on honesty.</li>
</ul>
<h3>The plus</h3>
<ul>
<li><strong>Complete</strong> - all data, including failed runs, aborted injections, repeat tests and the reasons for them. Deleting an inconvenient result destroys completeness even when the retained result is correct.</li>
<li><strong>Consistent</strong> - chronological, with a standardised date and time format, synchronised system clocks and a recorded time zone.</li>
<li><strong>Enduring</strong> - captured on durable, controlled media such as an issued form or a bound notebook.</li>
<li><strong>Available</strong> - retrievable for review and inspection throughout retention. Data locked inside an obsolete instrument nobody can read is not available.</li>
</ul>
<h3>The data lifecycle</h3>
<p>Integrity applies across generation, processing, review, reporting, retention, retrieval and eventual destruction. Most organisations control generation well and review poorly, which is why the review step is where inspectors look first.</p>
`,
      },
      {
        title: "Good Documentation Practice on Paper",
        duration: 18,
        content: `
<h2>Good Documentation Practice on Paper</h2>
<p>Paper is not the soft option. It carries no automatic audit trail, so the only defence against an altered record is the discipline of the conventions below, applied identically by everyone.</p>
<h3>Before the entry</h3>
<p>Records are made on controlled forms issued by quality assurance, uniquely numbered, marked page one of four and reconciled when returned. Operators photocopying their own blank forms is a finding, because an unused copy can be quietly destroyed and repeated until the numbers look right. Equipment logbooks are bound and paginated for the same reason.</p>
<h3>Making the entry</h3>
<ul>
<li>Use indelible ink. Blue is common because it distinguishes an original from a photocopy. Pencil and erasable pens are prohibited.</li>
<li>Record at the time of the activity, not afterwards, and never before.</li>
<li>Leave no field blank. Where a step does not apply, write N/A and initial and date it, so nobody can fill the gap later.</li>
<li>Do not use ditto marks, arrows or the word same to repeat a value. Write the value.</li>
<li>Sign only for work you personally performed or witnessed. Pre-signing a step that has not yet happened is falsification, not a shortcut.</li>
</ul>
<h3>Correcting an entry</h3>
<p>Draw a single line through the incorrect entry so it stays readable. Write the correct value beside it, then initial, date and give a reason where the reason is not self-evident. Correction fluid, overwriting a digit, scribbling out and rewriting the page neatly are all unacceptable, because each destroys the original observation. The original must survive the correction; that is the whole point.</p>
<h3>Late entries and attachments</h3>
<p>If an entry is genuinely missed, do not backdate it. Record the actual date you are writing, identify it as a late entry and state the date and time the activity occurred. Printouts attached to a record are signed and dated across the join between the printout and the page, so the attachment cannot be swapped. Every set of initials used anywhere must map to one named individual in a current signature log, which is itself a controlled record retained for the same period as the data.</p>
`,
      },
      {
        title: "Audit Trails, Hybrid Systems and Regulatory Findings",
        duration: 24,
        content: `
<h2>Audit Trails, Hybrid Systems and Regulatory Findings</h2>
<p>An electronic system removes the handwriting problem and replaces it with a privileges problem. What protects the record is not the software but the configuration and the review.</p>
<h3>What an audit trail actually is</h3>
<p>An audit trail is a secure, computer-generated, time-stamped record of the creation, modification and deletion of data, capturing who acted, what changed, the old and new values, when, and why. Users must not be able to switch it off, edit it or delete it. This is the expectation in EU GMP Annex 11 clause 9 and the equivalent PIC/S text Health Canada aligns with.</p>
<h3>Reviewing it</h3>
<p>Having an audit trail is not a control; reviewing it is. GMP-relevant entries are reviewed before the result is approved or the lot released, by someone independent of the person who generated the data, and the review is documented. Reviewers look for aborted or deleted injections, changed integration parameters, renamed samples, altered methods, adjusted system clocks and newly granted privileges. An audit trail that exists but has never been read is itself an observation.</p>
<h3>Why hybrid systems are the riskiest</h3>
<p>In a hybrid system the signature sits on paper while the true original data and its audit trail stay electronic. The two can drift apart: a signed printout may not correspond to the run held in the system, and reviewers who see only paper never look at the metadata. Control it by forcing every printout to carry the file name and path, acquisition date and time, operator ID and sequence position, and requiring the reviewer to open the electronic record. Regulators treat hybrid working as an interim state that needs a plan to move to full electronic records.</p>
<h3>What inspectors keep finding</h3>
<ul>
<li>Shared or generic logins, which destroy attributability outright.</li>
<li>Audit trails disabled, or never enabled because older instrument software shipped with the function switched off.</li>
<li>Backdated and pre-signed records.</li>
<li>Testing into compliance - repeating an analysis until it passes, running unofficial trial injections, or invalidating an out-of-specification result without a laboratory investigation.</li>
<li>Uncontrolled spreadsheets with unlocked formulae, no validation, no version control and no backup.</li>
<li>Analysts holding administrator rights that let them delete files or change the clock.</li>
</ul>
<p>Health Canada classifies inspection observations as Risk 1, 2 or 3. Data integrity failures involving falsified records are Risk 1 and can drive a non-compliant rating and suspension of the establishment licence.</p>
`,
      },
    ],
    quiz: {
      title: "Good Documentation Practices and Data Integrity - Knowledge Check",
      questions: [
        {
          text: "An analyst aborts a chromatographic injection, deletes it from the data system and reports only the runs that completed. Which ALCOA+ attribute is most directly breached?",
          options: [
            "Legible, because the deleted run can no longer be read by a reviewer",
            "Contemporaneous, because the decision to delete was taken after the analysis finished",
            "Complete, because all data generated must be retained, including failed and aborted runs",
            "Attributable, because nobody is named as having deleted the run",
          ],
          correctAnswer: "Complete, because all data generated must be retained, including failed and aborted runs",
          explanation: "Completeness requires every result generated to be retained, including failed, aborted and repeat runs together with the reason for them. Deleting an inconvenient injection also opens the door to testing into compliance.",
        },
        {
          text: "An operator records a weight of 12.5 kg on a batch record and immediately realises the true weight was 12.9 kg. What is the correct action?",
          options: [
            "Cover the entry with correction fluid and write the correct value in the cleared space",
            "Draw a single line through the entry so it stays readable, write the correct value beside it, then initial, date and give a reason",
            "Write the correct digits over the incorrect ones so the box contains only the true value",
            "Transcribe the page onto a fresh controlled form with the correct value and destroy the spoiled original",
          ],
          correctAnswer: "Draw a single line through the entry so it stays readable, write the correct value beside it, then initial, date and give a reason",
          explanation: "The original observation must survive the correction, which rules out correction fluid, overwriting and rewriting the page. The single strike-through with initials, date and reason keeps the record attributable and complete.",
        },
        {
          text: "Which practice meets the regulatory expectation for audit trail review in a GMP laboratory?",
          options: [
            "The audit trail is exported and filed with the batch record, and is examined only if a deviation or investigation is later raised",
            "The audit trail is reviewed once a year as part of the self-inspection programme",
            "The system administrator confirms in writing that the audit trail function was switched on for the duration of the analysis",
            "GMP-relevant audit trail entries are reviewed by someone independent of the person who generated the data, before the result is approved or the lot is released",
          ],
          correctAnswer: "GMP-relevant audit trail entries are reviewed by someone independent of the person who generated the data, before the result is approved or the lot is released",
          explanation: "The review is the control, not the existence of the audit trail, and it has to happen before the release decision it is meant to inform. Independence from the data generator is what makes the review meaningful.",
        },
        {
          text: "Why are hybrid paper and electronic systems generally treated as the riskiest arrangement?",
          options: [
            "The signature is applied to a paper printout while the true original data and its audit trail stay electronic, so the signed paper can become detached from the record it claims to represent",
            "Hybrid systems are technically incapable of generating an audit trail, so no metadata exists to review",
            "Health Canada does not permit hybrid systems under Division 2, so any use of one is an automatic Risk 1 observation",
            "Paper records in a hybrid system must be retained far longer than the electronic records, which makes archiving unmanageable",
          ],
          correctAnswer: "The signature is applied to a paper printout while the true original data and its audit trail stay electronic, so the signed paper can become detached from the record it claims to represent",
          explanation: "The signature and the original record live in two places, and reviewers who look only at the printout never see the metadata. Controls therefore force unique identifiers onto the printout and require the reviewer to open the electronic record.",
        },
      ],
    },
  },
  {
    code: "CST-QA-201",
    title: "Quality Assurance and Quality Control in Biomanufacturing",
    description:
      "This course separates what quality control tests from what quality assurance decides, and walks through the biologics release panel from identity to residual DNA. Learners will read specifications correctly, tell out-of-specification from out-of-trend, and follow a batch record review to a defensible release decision.",
    topic: "Quality Control/Assurance",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["qa", "qc", "gmp", "batch release", "biologics testing", "oos"],
    modules: [
      {
        title: "How Quality Assurance and Quality Control Divide the Work",
        duration: 18,
        content: `
<h2>How Quality Assurance and Quality Control Divide the Work</h2>
<p>Quality control generates evidence. Quality assurance decides what that evidence means and whether the lot may be sold. Confusing the two is the error new starters make most reliably, and it matters because only one of them can lawfully release a batch.</p>
<h3>What quality control actually does</h3>
<p>QC owns sampling plans, analytical methods, reference standards, retained samples and the laboratory itself. A QC analyst runs the potency bioassay, records the result and reports it against the specification. QC also carries environmental monitoring, water and utility testing, incoming material testing and the stability programme. QC work is measured in results: a number, a pass or a fail, a chromatogram that can still be reconstructed years later.</p>
<h3>What quality assurance actually does</h3>
<p>QA owns the system that produces those results. That means deviation and CAPA management, change control, supplier and contract-laboratory qualification, validation oversight, training records, internal audits, the annual product quality review, and batch record review leading to disposition. QA rarely touches a pipette. QA asks whether the method was validated, whether the operator was trained, whether the deviation raised during the fill was closed with an impact assessment, and whether the result can be trusted at all.</p>
<h3>The Canadian arrangement</h3>
<p>Canadian regulation does not use the QA and QC split as its legal vocabulary. Division 2 of Part C of the Food and Drug Regulations requires fabricators, packagers/labellers, importers and distributors to have a quality control department that is a distinct organisational unit, functioning independently of production and every other department, under the supervision of qualified personnel. Section C.02.014 requires that department to approve or reject each lot before sale. Health Canada guidance GUI-0001 sets out how this is expected to work in practice. The European Union places the equivalent duty on a named Qualified Person; Canada has no such role, so the authority sits with the head of the quality control department or a documented designate.</p>
<h3>Why the boundary sits where it does</h3>
<p>A group that both generates a result and decides its consequence has no independent check on itself. Separating generation from judgement is what forces a marginal result to be discussed and documented rather than quietly rationalised.</p>
`,
      },
      {
        title: "QC Testing, Specifications and When Testing Happens",
        duration: 22,
        content: `
<h2>QC Testing, Specifications and When Testing Happens</h2>
<p>No single assay characterises a biologic the way one characterises a small molecule. The release panel is a set of orthogonal tests, each answering a different question, shaped by ICH Q6B.</p>
<h3>The core panel</h3>
<ul>
<li><strong>Identity</strong> - confirms the molecule is the one on the label, by peptide mapping, capillary isoelectric focusing or a product-specific immunoassay. It must distinguish this product from others made on site.</li>
<li><strong>Purity and impurities</strong> - size-exclusion chromatography for aggregates and fragments, CE-SDS for size variants, imaged capillary isoelectric focusing for charge variants. Product-related impurities are reported separately from process-related ones.</li>
<li><strong>Potency</strong> - a measure of biological activity relevant to the mechanism of action, usually a cell-based bioassay reported as relative potency against a qualified reference standard. Bioassays are inherently variable, so ranges such as 70 to 130 per cent are normal, not sloppy.</li>
<li><strong>Sterility</strong> - membrane filtration or direct inoculation with 14 days incubation. Only a few containers are examined, so a pass is confirmatory, not proof; assurance comes from the validated aseptic process and its media fills.</li>
<li><strong>Bacterial endotoxin</strong> - gel clot, turbidimetric or chromogenic LAL, or recombinant factor C. The limit is K over M: the threshold pyrogenic dose, 5 EU per kilogram or 0.2 EU per kilogram intrathecally, divided by the maximum hourly dose per kilogram.</li>
<li><strong>Host cell protein</strong> - normally an ELISA using process-specific antisera whose antigen coverage has itself been demonstrated. Limits typically sit near 100 ng per mg.</li>
<li><strong>Residual DNA</strong> - qPCR against the host genome, commonly limited to 10 ng per dose with fragment size controlled below roughly 200 base pairs.</li>
</ul>
<h3>What a specification is</h3>
<p>A specification is a defined list of tests, the analytical procedures used, and the acceptance criteria. It is registered with the marketing authorisation, so changing a limit is a regulatory act, never a laboratory decision.</p>
<h3>In-process, release and stability testing</h3>
<p>In-process controls act during manufacture - viable cell density, harvest bioburden, column pool titre - and usually carry alert as well as action limits, so drift is seen before it becomes failure. Release testing is performed on the finished lot against the registered specification. Stability testing follows ICH Q5C and defines the shelf life. Shelf-life criteria may legitimately be wider than release criteria for attributes that change over time; the tighter release limit keeps the product inside the shelf-life limit on its last day of dating.</p>
`,
      },
      {
        title: "Out-of-Specification Results, Batch Review and Release",
        duration: 20,
        content: `
<h2>Out-of-Specification Results, Batch Review and Release</h2>
<p>Quality is judged by how an organisation handles a result it did not want.</p>
<h3>Out-of-specification is not out-of-trend</h3>
<p>An out-of-specification result falls outside an established acceptance criterion. An out-of-trend result sits inside the specification but is inconsistent with how the process or stability profile has behaved historically. A potency of 92 per cent in a process that has run at 104 to 110 per cent for two years passes, and is still a signal. Organisations that ignore OOT results reach an OOS they cannot explain.</p>
<h3>The phased investigation</h3>
<p>Phase I is the laboratory investigation. The analyst and supervisor assess the result before any solutions or preparations are discarded, because that material is the only physical evidence. The question is narrow: did a specific, documented, assignable laboratory error occur? A result is never invalidated because it is inconvenient, and repeating a preparation hoping for a better number - testing into compliance - is among the worst inspection findings. Hypothesis testing runs under a protocol approved before it begins.</p>
<p>If no laboratory cause is found, Phase II widens into manufacturing: batch record, open deviations, equipment history, raw materials, other lots from the same intermediate or media lot. The output is a documented conclusion, a batch decision and, where a real cause exists, a CAPA. Passing and failing results are not averaged into a passing mean unless averaging is defined in the method. Outlier tests can be defensible for a variable bioassay but not for invalidating a chemical assay result.</p>
<h3>Batch record review</h3>
<p>QA reviews the executed record for what is missing as much as what is written: blank fields, late entries, corrections without initial and date, yield reconciliation outside limits, an in-process result signed after the next step began, a calibration that expired mid-campaign. Every deviation must be closed with an impact assessment before disposition.</p>
<h3>Who may reject a lot</h3>
<p>Under section C.02.014, the quality control department approves or rejects each lot. That authority must be independent of production, because production is measured on schedule and yield, and the people carrying the cost of a scrapped batch cannot be the ones deciding to scrap it. No escalation or management decision can release a failing lot. For Schedule D biologics, Health Canada adds its own lot release programme: a lot release protocol, and sometimes confirmatory testing, go to the Biologic and Radiopharmaceutical Drugs Directorate before Canadian sale.</p>
`,
      },
    ],
    quiz: {
      title: "Quality Assurance and Quality Control in Biomanufacturing - Knowledge Check",
      questions: [
        {
          text: "All release results for a lot are within specification and the batch record review is complete. Under Canadian GMP, who holds the authority to approve the lot for sale?",
          options: [
            "The production supervisor who oversaw manufacture of the lot",
            "The QC analyst who performed and signed the release testing",
            "The quality control department, in a position independent of production",
            "The site general manager, as the most senior responsible person",
          ],
          correctAnswer: "The quality control department, in a position independent of production",
          explanation: "Section C.02.014 of the Food and Drug Regulations places lot approval or rejection with the quality control department, and that department must be independent of production so that schedule and yield pressure cannot influence the decision.",
        },
        {
          text: "A host cell protein ELISA returns a result above the registered acceptance criterion. The analyst reports nothing unusual about the run. What is the correct immediate action?",
          options: [
            "Repeat the assay twice and report the average of all three results",
            "Begin a documented Phase I laboratory investigation, retaining the original solutions and preparations",
            "Record the result as out-of-trend and continue with the release paperwork",
            "Invalidate the result as analyst error and take a fresh sample from the batch",
          ],
          correctAnswer: "Begin a documented Phase I laboratory investigation, retaining the original solutions and preparations",
          explanation: "Phase I assesses whether an assignable laboratory error occurred, and it must happen before the original solutions are discarded because they are the only physical evidence. Averaging or re-sampling first would be testing into compliance.",
        },
        {
          text: "Why does a passing compendial sterility test not, by itself, demonstrate that a batch of sterile product is sterile?",
          options: [
            "The 14 day incubation period is too short to recover most contaminants",
            "The test detects bacteria but cannot detect fungal contamination",
            "It samples only a small number of containers, so sterility assurance rests on the validated aseptic process",
            "It is performed on in-process material rather than on the finished product",
          ],
          correctAnswer: "It samples only a small number of containers, so sterility assurance rests on the validated aseptic process",
          explanation: "The sterility test examines a statistically small fraction of the lot, so it can confirm but not prove sterility; assurance comes from aseptic process design, validation and media fills.",
        },
        {
          text: "A degradation product has a release acceptance criterion of not more than 2 per cent and a shelf-life acceptance criterion of not more than 5 per cent. What does this difference reflect?",
          options: [
            "An error, because release and shelf-life acceptance criteria must always be identical",
            "The tighter release limit ensures the product still meets the shelf-life limit at the end of its dating period",
            "The stability method is less sensitive, so it requires a wider acceptance range",
            "The shelf-life criterion applies only to retained samples, not to marketed product",
          ],
          correctAnswer: "The tighter release limit ensures the product still meets the shelf-life limit at the end of its dating period",
          explanation: "For attributes that change over storage, the release limit is deliberately set inside the shelf-life limit so that expected degradation over the approved storage period cannot push the product out of specification.",
        },
      ],
    },
  },
  {
    code: "CST-CAPA-201",
    title: "Deviations, CAPA and Root Cause Analysis",
    description:
      "After this course you will classify deviations, incidents and nonconformances correctly at triage, choose a root cause technique that fits the event, and write a CAPA whose effectiveness check can actually fail. You will also read CAPA backlog metrics for signs of system strain.",
    topic: "Quality Control/Assurance",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["capa", "deviations", "root cause analysis", "gmp", "quality systems"],
    modules: [
      {
        title: "Deviations, Incidents and Nonconformances",
        duration: 18,
        content: `
<h2>Deviations, Incidents and Nonconformances</h2>
<p>Quality systems fail more often at triage than at investigation. An event named wrongly on day one enters the wrong workflow, gets the wrong clock and the wrong scope, and stays there until an inspector finds it.</p>
<h3>Three words that are not synonyms</h3>
<p>A <strong>deviation</strong> is a departure from an approved instruction, procedure, specification or established standard. There is always a controlled document it departed from, and naming that document is the first line of the record. An <strong>incident</strong> is an unplanned event that may not have breached any written instruction: a power interruption during an incubation, a spill in a controlled area, a fire alarm evacuation part-way through an aseptic filling operation. Incidents are often the more informative records precisely because no procedure covered the situation. A <strong>nonconformance</strong> describes a thing rather than an event - a batch, component or result that fails a specified requirement. An out-of-specification result is a nonconformance with its own procedure, and the laboratory phase of that investigation must be completed and documented before any retest is authorised.</p>
<h3>Planned deviations</h3>
<p>A planned deviation is a bounded, risk-assessed, one-time departure authorised in writing before execution. It is legitimate once. Used repeatedly for the same step, it is a change control that nobody wrote, and it will be read that way in an inspection.</p>
<h3>Triage and risk classification</h3>
<p>Triage runs on a clock - commonly notification to Quality within one business day and a record opened within three - and it answers two questions. First, is product affected, and is any affected batch already released or in distribution? That answer drives quarantine and, if the material has shipped, a health hazard evaluation. Second, what class? Critical events have actual or probable impact on patient safety, product quality, or the integrity of a licence or a regulatory submission. Major events have a plausible quality impact or expose a systemic weakness. Minor events have neither and are usually documentation errors.</p>
<p>Classification is set by risk, never by workload. The most common failure is quiet downgrading at triage because a lower class carries a lighter workflow and a shorter clock. Health Canada's GMP guide, GUI-0001, expects significant deviations to be recorded and investigated, and the investigation extended to other batches and products that could share the same failure. An under-classified event therefore leaves an under-scoped investigation behind it, and that gap is what gets cited.</p>
`,
      },
      {
        title: "Root Cause Analysis in Practice",
        duration: 22,
        content: `
<h2>Root Cause Analysis in Practice</h2>
<p>Root cause analysis is an evidence standard, not a technique. A cause qualifies only if removing it would have prevented the event, and if it explains why it happened that day and not on the two hundred before.</p>
<h3>Describe before you explain</h3>
<p>Write the problem statement before any tool comes out: the object, the defect, when and where it was first seen, and what proportion is affected. Then write the is-not - the comparable lines, shifts or lots where the same defect did not appear. That contrast is where the cause hides. Teams who skip it produce long lists of candidate causes with no way to eliminate any.</p>
<h3>Three tools and how each one fails</h3>
<p>Five Whys is cheap and adequate for a simple single-chain event. It fails predictably: it is linear, so it cannot hold two causes that had to coincide; it stops at the first answer that sounds like a cause; it drifts towards whoever stood nearest the equipment; and its links are asserted, not demonstrated. One rule repairs most of that: after every why, ask how you know, and record the evidence. A chain with an unevidenced link is a hypothesis, not a finding.</p>
<p>An Ishikawa diagram sorts candidate causes under people, method, machine, material, measurement and environment. Its value is breadth; its failure mode is stopping at the diagram, since every branch is still a hypothesis to test against data. Fault tree analysis works downwards from the undesired event through Boolean AND and OR gates, and suits events where conditions had to coincide: an AND gate says plainly that two barriers failed together. It holds only the failure modes somebody thought of, and quantifying it needs failure rate data most sites lack, so use it structurally, not numerically.</p>
<h3>Why operator error is almost never a root cause</h3>
<p>Human error describes what happened, not why it was possible. Slips and lapses, rule-based mistakes and deliberate violations each have a different fix, and retraining is the right answer to almost none of them. Ask instead why the error was possible - no forcing function, two near-identical label reels stored side by side, a procedure that does not match the room - and why no control caught it. An organisation closing more than one deviation in ten to human error should read that ratio as a defect in its own investigation process.</p>
`,
      },
      {
        title: "Correction, Corrective Action and CAPA System Health",
        duration: 20,
        content: `
<h2>Correction, Corrective Action and CAPA System Health</h2>
<p>CAPA systems get overloaded because they confuse three different actions and track them all to one date.</p>
<h3>Three actions, three purposes</h3>
<p>A <strong>correction</strong> fixes the thing in front of you: reject the batch, re-clean the vessel. It changes nothing about why it happened. A <strong>corrective action</strong> eliminates the cause of an event that has occurred, so that it does not recur - an interlock, or a procedure rewritten the way the job is actually done. A <strong>preventive action</strong> eliminates the cause of an event that has not happened here, found in a trend or an audit.</p>
<p>The everyday sense of preventive causes most mislabelling: an action that stops a recurrence sounds preventive, but if the event has occurred it is corrective. Fitting that same interlock to three other filling lines that share the design and have not failed is preventive. ISO 9001:2015 dropped preventive action in favour of risk-based thinking, but ISO 13485:2016 keeps it, and Health Canada requires MDSAP certification to that standard for Class II, III and IV device licences.</p>
<h3>Effectiveness checks</h3>
<p>Completing an action is not evidence that it worked. Closure needs implementation verification - procedure issued, interlock installed, staff qualified - then effectiveness verification, gathered once the action has run long enough to be tested. Design the check when you write the CAPA: metric, window, sample size and acceptance criterion, fixed before you know the answer. Absence of recurrence is weak evidence for a rare event, so if the deviation occurred twice in two years, six quiet months prove nothing; use a leading indicator instead, such as twenty observed changeovers. A failed check does not close the record; it returns to the investigation, because the usual reason an action fails is a wrong cause.</p>
<h3>System health</h3>
<p>Watch the overdue count, the age of the oldest open record, the repeat rate, the share closed to human error, and the effectiveness check failure rate. A failure rate of zero is a warning, not an achievement: the criteria are written so they cannot fail. A backlog also changes behaviour - investigators write to the deadline rather than the evidence, triage downgrades events into lighter workflows, and staff stop raising minor deviations. Inspectors sample the oldest and the overdue first. The remedy is a triage that closes most deviations on correction with a documented rationale, keeping formal CAPA for events over a defined threshold.</p>
`,
      },
    ],
    quiz: {
      title: "Deviations, CAPA and Root Cause Analysis - Knowledge Check",
      questions: [
        {
          text: "A filling line stops mid-batch when a worn gasket fails. The batch is rejected, the gasket is replaced, that gasket type is added to the preventive maintenance schedule for the failed line, and the same schedule change is then applied to three other lines that use the identical gasket but have not failed. Which of these is the preventive action?",
          options: [
            "Rejecting the affected batch",
            "Replacing the worn gasket on the failed line",
            "Adding the gasket to the preventive maintenance schedule for the failed line",
            "Applying the schedule change to the three lines that have not failed",
          ],
          correctAnswer: "Applying the schedule change to the three lines that have not failed",
          explanation: "Preventive action addresses the cause of an event that has not occurred at that location. Rejecting the batch and replacing the gasket are corrections, and the schedule change on the failed line is corrective action.",
        },
        {
          text: "An investigation into a sterility failure establishes that two independent controls had to fail at the same time for the event to occur. Which technique best represents this, and why?",
          options: [
            "Five Whys, because it follows the causal chain back to a single origin",
            "Fault tree analysis, because its AND gates show explicitly that both barriers had to fail together",
            "An Ishikawa diagram, because it groups candidate causes under people, method, machine and material",
            "A Pareto analysis, because it ranks the contributing causes by frequency",
          ],
          correctAnswer: "Fault tree analysis, because its AND gates show explicitly that both barriers had to fail together",
          explanation: "Five Whys is linear and cannot hold two causes that had to coincide. A fault tree's Boolean AND gate states plainly that both barriers failed together.",
        },
        {
          text: "An investigation concludes that a mix-up happened because an operator selected the wrong label reel, and the corrective action is to retrain that operator. Why is this unacceptable as a root cause conclusion?",
          options: [
            "It states what happened rather than why the error was possible and why no control detected it",
            "Retraining is never an acceptable corrective action in a regulated environment",
            "Human error may only be cited if the operator confirms the conclusion in writing",
            "Labelling events must always be classified as critical deviations regardless of product impact",
          ],
          correctAnswer: "It states what happened rather than why the error was possible and why no control detected it",
          explanation: "Human error is the starting point of an investigation, not its conclusion. The record must explain the condition that allowed the error, such as near-identical reels stored side by side, and why no control caught it.",
        },
        {
          text: "A quality unit reports that every CAPA effectiveness check completed in the past two years has passed. How should this result be interpreted?",
          options: [
            "As evidence that the root cause analysis process is performing well",
            "As a normal result, since effectiveness checks are a documentation formality",
            "As a warning that the acceptance criteria are being written so that they cannot fail",
            "As a reason to shorten the effectiveness check interval on future CAPAs",
          ],
          correctAnswer: "As a warning that the acceptance criteria are being written so that they cannot fail",
          explanation: "A sustained pass rate of one hundred per cent usually means criteria are set after the fact or chosen so they cannot be failed. A healthy system fails some checks and returns those records to the investigation.",
        },
      ],
    },
  },
  {
    code: "TA-MAB-201",
    title: "Monoclonal Antibody Development",
    description:
      "Explains how antibody structure drives isotype and format choice, how candidates are discovered and humanised, and how a CHO cell line and platform process are built around them. You will be able to interpret a mAb quality dossier and justify each critical attribute.",
    topic: "Biomanufacturing - General",
    provider: "Talent Accelerator",
    delivery: "Asynchronous",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["monoclonal antibodies", "cho cells", "glycosylation", "critical quality attributes", "biosimilars", "bioprocess"],
    modules: [
      {
        title: "Antibody Structure, Function and Discovery",
        duration: 18,
        content: `
<h2>Antibody Structure, Function and Discovery</h2>
<p>Almost every decision in a monoclonal antibody programme - isotype, expression host, purification platform, release specification - traces back to the architecture of the molecule. Learn the architecture and the rest of the path stops looking arbitrary.</p>
<h3>Two ends, two jobs</h3>
<p>A typical IgG is about 150 kDa: two heavy chains of roughly 50 kDa and two light chains of roughly 25 kDa, kappa or lambda, joined by interchain disulphide bonds. The two Fab arms carry the binding site, formed by six complementarity-determining regions - three from the heavy variable domain, three from the light - of which CDR-H3 is the most diverse and usually dominates affinity. The Fc, made of the paired CH2 and CH3 domains below the hinge, does everything else. It recruits immune effectors, and it binds the neonatal Fc receptor, whose pH-dependent recycling gives IgG a serum half-life near three weeks.</p>
<h3>Isotype is an engineering choice</h3>
<p>IgG1 binds Fc gamma receptor IIIa and C1q well, so it is selected when the target cell should be killed by antibody-dependent cellular cytotoxicity or by complement. IgG2 and IgG4 recruit effectors weakly and suit pure blockade, which is why PD-1 blockers are typically IgG4. IgG4 swaps half-molecules in circulation, so developers stabilise the hinge with a serine-to-proline substitution at position 228. Where effector function must be off entirely, Fc-silencing mutations such as L234A/L235A, or removal of the Asn297 glycan, are used.</p>
<h3>Discovery routes</h3>
<p>Hybridoma fusion of splenocytes from an immunised mouse with a myeloma line, selected in HAT medium, is cheap and preserves natural heavy-light chain pairing, but the output is murine and immunogenic. Phage display panning of human scFv or Fab libraries needs no animal and yields human sequences directly, at the cost of artificial chain pairing and no in vivo affinity maturation. Transgenic animals carrying human immunoglobulin loci give fully human, natively paired, affinity-matured antibodies in a single step. Single B-cell cloning from immunised animals or convalescent donors is the fastest route from antigen to sequence.</p>
<h3>Humanisation</h3>
<p>Murine antibodies are humanised by grafting the six CDRs onto a human germline framework. Grafting alone often costs ten- to fiftyfold in affinity, because framework residues in the Vernier zone hold the loops in shape; a small number of back-mutations to the murine residue normally recovers it. Chimeric antibodies - murine variable domains on human constant regions - are the older, cruder version.</p>
`,
      },
      {
        title: "Formats, Cell Lines and the Development Path",
        duration: 22,
        content: `
<h2>Formats, Cell Lines and the Development Path</h2>
<p>The format chosen at lead selection fixes the manufacturing platform for the life of the product, so it is a manufacturing decision as much as a biological one.</p>
<h3>Beyond plain IgG</h3>
<p>Bispecific antibodies engage two targets at once. T-cell engagers tether a tumour antigen to CD3 and force a synapse; blinatumomab has no Fc, so its half-life is measured in hours and it is given by continuous infusion. IgG-like bispecifics solve heavy-chain pairing with knobs-into-holes mutations and light-chain mispairing with a common light chain, domain crossover or controlled Fab-arm exchange. The mispaired by-products, not the pharmacology, make them hard to purify and characterise.</p>
<p>Antibody-drug conjugates carry a cytotoxic payload on a linker, and the drug-to-antibody ratio, commonly two to eight, is itself a quality attribute. Cleavable linkers such as valine-citrulline release a membrane-permeable payload that also kills adjacent antigen-negative cells - the bystander effect - while non-cleavable linkers need the whole antibody degraded in the lysosome. Conjugation is a separate drug substance step run under high-potency containment.</p>
<p>Fragments - Fab, scFv and single-domain VHH - drop the Fc when the goal is tissue penetration or local delivery, not a long half-life. Carrying no glycan, they can be made in E. coli, which changes the cost base.</p>
<h3>Why CHO dominates</h3>
<p>Chinese hamster ovary cells adapt to suspension culture in chemically defined, serum-free media and routinely deliver three to eight grams per litre in fed-batch. They glycosylate in a way patients tolerate: unlike the murine NS0 and SP2/0 lines they add negligible alpha-1,3-galactose, the epitope implicated in hypersensitivity to cetuximab, and almost no N-glycolylneuraminic acid. They are also poorly permissive to most human viruses. The decisive advantage is precedent: a CHO platform process is familiar to every reviewer, which shortens development and assessment.</p>
<h3>From clone to process</h3>
<p>Leads are first triaged for developability: thermal stability, self-association, hydrophobicity and sequence liabilities such as a glycosylation sequon or a deamidation-prone asparagine-glycine motif in a CDR. Cell line development transfects the host with the antibody genes and a selection marker - glutamine synthetase with methionine sulphoximine, or dihydrofolate reductase with methotrexate - isolates single cells with documented clonality assurance, and banks the clone as a two-tier master and working cell bank. Downstream is a platform: Protein A capture, low-pH viral inactivation, anion exchange in flow-through, a polishing step, 20 nm virus filtration and ultrafiltration into formulation buffer.</p>
`,
      },
      {
        title: "Critical Quality Attributes, Comparability and Biosimilars",
        duration: 20,
        content: `
<h2>Critical Quality Attributes, Comparability and Biosimilars</h2>
<p>A critical quality attribute is a property that must stay within a defined range for the product to be safe and effective. Criticality is assigned by risk assessment against the target product profile, not by assay sensitivity.</p>
<h3>Glycosylation</h3>
<p>Each heavy chain carries one N-linked glycan at Asn297, buried between the CH2 domains. On a CHO-derived IgG the dominant species are core-fucosylated biantennary structures bearing zero, one or two galactoses. Small shifts carry large clinical consequences. Removing core fucose raises Fc gamma receptor IIIa affinity by up to fiftyfold and sharply increases antibody-dependent cellular cytotoxicity, the basis of glycoengineered products such as obinutuzumab. Terminal galactose modestly increases C1q binding and complement lysis. High-mannose species are cleared faster through the mannose receptor, shortening half-life. Removing the glycan altogether abolishes effector function but leaves FcRn binding, and therefore half-life, intact. The profile moves with manganese and galactose in the feed, with pH and with culture duration, so glycans are both a process lever and a release attribute.</p>
<h3>Aggregation and charge variants</h3>
<p>Aggregates matter most: multivalent display of the antibody can break B-cell tolerance and provoke anti-drug antibodies. They are measured by size-exclusion chromatography, with an orthogonal method and subvisible particle counting alongside. Low-pH holds, air-liquid interfaces, agitation, freeze-thaw and concentrated subcutaneous formulations all promote them; surfactant and buffer choice hold them down.</p>
<p>Charge variants are resolved by imaged capillary isoelectric focusing or cation exchange. Acidic species arise mainly from deamidation, glycation and sialylation; basic species from unclipped C-terminal lysine. Not all are critical: C-terminal lysine is stripped within hours in circulation and is accepted as non-critical, whereas deamidation of an asparagine inside a CDR costs potency and must be controlled.</p>
<h3>Comparability and biosimilarity</h3>
<p>These are different questions. Comparability, under ICH Q5E, applies when a manufacturer changes its own process - a new site, a larger bioreactor, a new cell bank - and must show no adverse impact on quality, safety or efficacy, using side-by-side analytical testing against retained pre-change material. Biosimilarity applies when a second manufacturer builds a product against an authorised reference biologic with no access to its cell line or process. Health Canada authorises biosimilars through a New Drug Submission; its foundation is structural and functional characterisation, with clinical data confirming rather than establishing similarity. Health Canada does not declare a biosimilar interchangeable; switching and substitution policy rests with the provinces and territories.</p>
`,
      },
    ],
    quiz: {
      title: "Monoclonal Antibody Development - Knowledge Check",
      questions: [
        {
          text: "A humanised candidate built by grafting the six murine CDRs onto a human germline framework binds its antigen twenty times more weakly than the parent murine antibody. What is the standard remedy?",
          options: [
            "Switch the constant region from IgG1 to IgG4, which relieves steric constraint on the CDR loops",
            "Back-mutate a small number of human framework residues in the Vernier zone to the original murine residues and re-test binding",
            "Remove the Asn297 glycan, since Fc glycosylation dictates the conformation of the variable domains",
            "Express the graft in HEK293 instead of CHO, since host cell glycosylation determines antigen-binding affinity",
          ],
          correctAnswer: "Back-mutate a small number of human framework residues in the Vernier zone to the original murine residues and re-test binding",
          explanation: "Framework residues in the Vernier zone position the grafted loops, so affinity lost on grafting is normally recovered by reverting a handful of them to the murine sequence. The Fc region and the host cell line do not influence antigen binding.",
        },
        {
          text: "Which statement best explains why CHO cells dominate therapeutic monoclonal antibody manufacture?",
          options: [
            "They are the only mammalian host capable of secreting a fully assembled, disulphide-bonded IgG",
            "They glycosylate identically to human cells, so glycan analysis is not required at lot release",
            "They divide faster than E. coli, which shortens the production campaign and lowers cost of goods",
            "They grow to high density in suspension in chemically defined media, add glycans humans tolerate, and carry decades of regulatory precedent as a platform host",
          ],
          correctAnswer: "They grow to high density in suspension in chemically defined media, add glycans humans tolerate, and carry decades of regulatory precedent as a platform host",
          explanation: "CHO combine high fed-batch titres, human-compatible glycosylation with negligible alpha-1,3-galactose, and a long regulatory track record. Murine and human lines also secrete assembled IgG, CHO glycans are not identical to human ones, and CHO grow far more slowly than E. coli.",
        },
        {
          text: "A process change removes core fucose from most of the Fc glycans on an IgG1. What is the expected consequence?",
          options: [
            "A shorter serum half-life, because FcRn no longer binds the CH2-CH3 interface",
            "Loss of antigen binding, because fucose forms part of the CDR-H3 contact surface",
            "Markedly stronger antibody-dependent cellular cytotoxicity, through much tighter binding to Fc gamma receptor IIIa",
            "A large increase in high molecular weight aggregate, because fucose is the principal stabiliser of the Fab arms",
          ],
          correctAnswer: "Markedly stronger antibody-dependent cellular cytotoxicity, through much tighter binding to Fc gamma receptor IIIa",
          explanation: "Afucosylated IgG1 binds Fc gamma receptor IIIa up to fiftyfold more tightly, which is the deliberate design of glycoengineered antibodies such as obinutuzumab. FcRn binding, antigen binding and aggregation are not driven by core fucose.",
        },
        {
          text: "A company is transferring its licensed mAb from its original commercial site to a new facility with a bioreactor of the same scale. Which regulatory exercise applies?",
          options: [
            "An ICH Q5E comparability exercise, testing post-change material side by side against retained pre-change material",
            "A biosimilar submission, because material from a new facility is a distinct product",
            "No submission at all, provided the release specification is unchanged",
            "A full new clinical development programme, because any site change invalidates the original efficacy data",
          ],
          correctAnswer: "An ICH Q5E comparability exercise, testing post-change material side by side against retained pre-change material",
          explanation: "Comparability under ICH Q5E covers a manufacturer changing its own process, and starts with side-by-side analytical testing, escalating to nonclinical or clinical work only if differences cannot be justified. Biosimilarity applies to a second manufacturer working against another company's reference product.",
        },
      ],
    },
  },
  {
    code: "CST-ASE-301",
    title: "Aseptic Technique and Cleanroom Behaviour",
    description:
      "Prepares you for a hands-on aseptic workshop: identify contamination sources, read cleanroom grades against ISO 14644 classes, and gown without compromising a sterile garment. You will also interpret environmental monitoring results and explain what a media fill actually qualifies.",
    topic: "Biomanufacturing - General",
    provider: "CASTL",
    delivery: "In-Person",
    duration: 240,
    creditCost: 100,
    isSpecial: true,
    tags: ["aseptic technique", "cleanroom", "gmp", "sterile manufacturing", "environmental monitoring", "media fill"],
    modules: [
      {
        title: "Contamination Control and the Classified Environment",
        duration: 80,
        content: `
<h2>Contamination Control and the Classified Environment</h2>
<p>This module is pre-reading for an in-person, hands-on workshop, and reference material afterwards. Read it before you arrive: the classified suite makes far more sense once you know why the rooms are built as they are, and the practical session is then spent correcting your hands rather than defining terms.</p>
<h3>The operator is the dominant contamination source</h3>
<p>Air, surfaces, water and components all carry risk, but people dominate. A person standing still releases on the order of a hundred thousand particles per minute; the same person walking briskly releases several million, much of it skin scale large enough to carry viable organisms. The garment is what holds most of that in. Every other control in the suite - filtration, pressure, garments, flow paths - exists to keep that shedding away from exposed product.</p>
<h3>Grades A, B, C and D</h3>
<p>Grade A is the critical zone where sterilised product, components and closures are exposed: the laminar flow hood, the isolator, the filling point. Grade B is the immediate background to grade A in conventional filling, and where gowned operators stand. Grades C and D are supporting rooms - solution preparation, component washing, non-sterile assembly.</p>
<h3>ISO classes and the two states of a room</h3>
<p>Grades are GMP terms; ISO 14644-1 classes are the particle measurement behind them. ISO 5 permits 3,520 particles of 0.5 micrometres and larger per cubic metre, ISO 7 permits 352,000 and ISO 8 permits 3,520,000. Grade A is ISO 5 both at rest and in operation. Grade B is ISO 5 at rest but only ISO 7 in operation. Grade C is ISO 7 at rest and ISO 8 in operation. Grade D is ISO 8 at rest. The reliable novice error is to quote one number for a room. A classified room always has two states, and the in-operation figure is the one that describes reality with people and equipment working in it.</p>
<h3>Where the rules come from</h3>
<p>In Canada, sterile drug manufacture sits under Division 2, Part C of the Food and Drug Regulations, with Health Canada guidance GUI-0001. Health Canada is a PIC/S participating authority, so its expectations align with PIC/S Annex 1, which mirrors EU GMP Annex 1 - guidance, though, with Division 2 still the enforceable requirement. Sterile compounding in Canadian pharmacies follows the NAPRA model standards instead - a different document, the same physics.</p>
`,
      },
      {
        title: "Gowning, First Air and Aseptic Behaviour",
        duration: 90,
        content: `
<h2>Gowning, First Air and Aseptic Behaviour</h2>
<p>Gowning and airflow discipline are motor skills, not knowledge. You will be assessed on them visually during the workshop, with an observer watching your hands and body position. Read this so the coaching on the day is a correction rather than an introduction.</p>
<h3>The gowning sequence and its single rule</h3>
<p>The sequence runs top down, because everything you shed falls. Jewellery and cosmetics are removed outside; hands and forearms are washed and dried. Then hood, mask and goggles, then coverall, then boots pulled over the coverall legs, then sterile gloves drawn over the coverall cuffs. Gloves are last because they are the surface that comes closest to the product.</p>
<p>One rule governs the whole sequence: never contaminate what you have already gowned. You handle each garment only by the surface that will end up facing inwards. A coverall is unfolded and stepped into one leg at a time without the fabric touching the floor. If a sleeve brushes a bench or a wall, the garment is discarded, not wiped - there is no way to restore sterility to a garment surface in a gowning room. The mirror check at the end is not vanity; it is the only way to see the back of your hood and the gap at your ankle.</p>
<h3>Unidirectional airflow and first air</h3>
<p>A grade A zone is swept by HEPA-filtered air moving in one direction at a qualified velocity, commonly 0.36 to 0.54 metres per second at the working position. That air is clean only until it touches something. First air is air that has left the filter and has not yet passed over any object. It is the only air you may allow onto an open container, a stopper or a sterilised needle.</p>
<h3>Why you never intervene above an open container</h3>
<p>Because first air travels from filter to product, anything you place upstream of an opening sheds directly into it. A gloved hand, a forceps, a stopper bowl or a forearm held over an open vial puts a shedding surface into the path. Work from the side and from downstream, keep hands flat and low, never reach across sterilised components, and lay the work out so that no routine movement crosses above an opening. Movement speed matters as much as position: rapid motion generates turbulence that drags less clean background air into the critical zone.</p>
`,
      },
      {
        title: "Flow, Environmental Monitoring and Aseptic Process Simulation",
        duration: 70,
        content: `
<h2>Flow, Environmental Monitoring and Aseptic Process Simulation</h2>
<p>This module is the reference half of the workshop. During the practical you will set settle plates, take a glove print and walk a material path; use this text to understand what those actions are evidence of.</p>
<h3>Personnel and material flow</h3>
<p>People and materials enter through separate airlocks and move in one direction, so a clean path never crosses a dirty one. Airlock doors are interlocked because opening both at once collapses the pressure cascade the airlock exists to maintain. Adjacent rooms of different grade are held at a differential pressure, 10 pascals being a common design value, so leakage runs from cleaner to less clean. Sterilised components reach grade A through a double-ended autoclave, a sterilising tunnel or a decontamination pass-through; waste leaves by a separate route.</p>
<h3>Viable and non-viable monitoring</h3>
<p>Non-viable particle counting runs continuously in grade A throughout processing, including equipment set-up, so an excursion can be tied to a moment in the batch record. Viable monitoring uses settle plates of 90 millimetres, exposed no more than four hours each and changed to cover the whole critical operation; contact plates of 55 millimetres for flat surfaces, with residue removed afterwards using 70 per cent isopropanol; swabs for irregular surfaces; and active air sampling drawing a known volume, typically one cubic metre in grade A. Glove prints and gown plates are taken after critical interventions and on exit, with a glove change straight afterwards, because pressing agar compromises the hands you are relying on. Grade A is effectively a no-growth environment: a single colony is an action-level event. Grade B air carries a limit of 10 colony-forming units per cubic metre.</p>
<h3>The media fill qualifies the operator</h3>
<p>An aseptic process simulation replaces product with a growth medium, usually soybean casein digest broth, and runs the process as it is really run - worst-case line speed, the maximum permitted interventions, a shift change, the full routine duration. Every filled unit is incubated and inspected; the criterion is zero contaminated units, and any growth triggers a full investigation. Lines are requalified twice a year, and every operator who works aseptically takes part in at least one simulation annually. That last requirement is the point: a media fill qualifies the person as much as the process, and a failure is far more often traced to a behaviour than to a machine.</p>
`,
      },
    ],
    quiz: {
      title: "Aseptic Technique and Cleanroom Behaviour - Knowledge Check",
      questions: [
        {
          text: "A grade B cleanroom is monitored while a filling operation is under way with gowned operators present. Which ISO 14644-1 class must it meet in that state?",
          options: [
            "ISO 5",
            "ISO 6",
            "ISO 7",
            "ISO 8",
          ],
          correctAnswer: "ISO 7",
          explanation: "Grade B is ISO 5 at rest but only ISO 7 in operation. Quoting a single class for a room is the common error - every classified room has both an at-rest and an in-operation limit.",
        },
        {
          text: "Why must an operator never hold a gloved hand or a tool above an open vial inside a grade A zone?",
          options: [
            "Unidirectional air passes over the hand before it reaches the vial, so anything shed from the hand is carried straight into the container",
            "The hand blocks the operator's view of the fill level and increases the risk of an overfill",
            "Body heat from the hand raises the local temperature enough to encourage microbial growth in the product",
            "The hand interrupts the continuous particle counter and invalidates the environmental monitoring record for the batch",
          ],
          correctAnswer: "Unidirectional air passes over the hand before it reaches the vial, so anything shed from the hand is carried straight into the container",
          explanation: "First air is air that has left the HEPA filter and has not yet passed over any object. Placing anything upstream of an opening destroys first air and delivers shed particles directly to the product.",
        },
        {
          text: "While stepping into a sterile coverall in the gowning room, a trainee lets one leg of the garment brush the floor. What is the correct action?",
          options: [
            "Wipe the affected area with a sterile 70 per cent isopropanol wipe and carry on gowning",
            "Discard the coverall and begin again with a new sterile garment",
            "Carry on gowning, since the gowning room floor is disinfected on a daily schedule",
            "Carry on gowning and record the contact as a deviation at the end of the session",
          ],
          correctAnswer: "Discard the coverall and begin again with a new sterile garment",
          explanation: "The governing rule is never to contaminate what you have already gowned, and sterility cannot be restored to a garment surface by wiping it. A contacted garment is discarded.",
        },
        {
          text: "An operator has worked on an aseptic filling line for eighteen months and has never taken part in an aseptic process simulation, although the line itself has passed every scheduled media fill. What is the problem?",
          options: [
            "Nothing, provided the line has been requalified twice a year as required",
            "Nothing, provided the operator has passed an annual gowning qualification",
            "The operator must now repeat the three consecutive simulation runs used for initial line qualification",
            "Each operator working aseptically must take part in at least one simulation per year, so this operator's aseptic qualification has lapsed",
          ],
          correctAnswer: "Each operator working aseptically must take part in at least one simulation per year, so this operator's aseptic qualification has lapsed",
          explanation: "A media fill qualifies the person as much as the process, which is why participation is required of every aseptic operator annually. A line record cannot substitute for an individual's qualification.",
        },
      ],
    },
  },
  {
    code: "CST-USP-201",
    title: "Upstream Processing: Cell Culture and Bioreactors",
    description:
      "This course takes you from cell line selection and cell banking through media design, seed train expansion and bioreactor operation to harvest. You will be able to justify a bioreactor mode, set control parameters and defend a scale-up criterion.",
    topic: "Biomanufacturing - USP/DSP",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 75,
    creditCost: 100,
    isSpecial: false,
    tags: ["upstream", "cell culture", "bioreactor", "fed-batch", "scale-up", "cho"],
    modules: [
      {
        title: "Cell Lines, Cell Banks and Media",
        duration: 25,
        content: `
<h2>Cell Lines, Cell Banks and Media</h2>
<p>Everything downstream inherits the decisions made here. A line that expresses well but drifts, or a medium that varies between lots, cannot be fixed later by a better column.</p>
<h3>Choosing the host</h3>
<p>Chinese hamster ovary (CHO) cells carry the large majority of licensed recombinant therapeutic proteins. The reasons are practical: CHO grows in suspension in chemically defined medium, tolerates high density, glycosylates closely enough to human patterns, resists most human pathogenic viruses, and carries decades of regulatory precedent. Common lineages are CHO-K1, DG44 and CHO-S, paired with a selection system - dihydrofolate reductase with methotrexate amplification, or glutamine synthetase knockout with methionine sulphoximine. HEK293 dominates viral vector work, and E. coli remains the choice for proteins needing no glycosylation.</p>
<p>Regulators expect assurance that the line descends from a single cell: documented single-cell cloning with imaging evidence, or a limiting-dilution probability argument backed by extra characterisation and stability data.</p>
<h3>Why two tiers of cell bank</h3>
<p>A Master Cell Bank (MCB) is made from one clone and vialled once. A Working Cell Bank (WCB) is expanded from a single MCB vial. The MCB carries the full characterisation package - identity, sterility, mycoplasma, adventitious agent testing under ICH Q5A(R2), genetic stability under ICH Q5B, banking practice under ICH Q5D - and it is finite and irreplaceable. Routine manufacturing draws only on the WCB, so the MCB survives the licensed life of the product. Banks are split across physically separate vapour-phase nitrogen stores. Health Canada applies the same ICH Q5D expectations in a Clinical Trial Application or New Drug Submission. Cells at the limit of in vitro cell age are tested to show the line has not changed across the manufacturing window.</p>
<h3>Media and feed strategy</h3>
<p>Serum has been designed out: foetal bovine serum brought TSE risk, adventitious virus risk and lot-to-lot variability no control strategy could absorb. Plant and yeast hydrolysates are animal-component-free but chemically undefined, which makes them a liability in any comparability exercise. A fed-batch process pairs a basal medium with one or two concentrated feeds plus separate glucose control, and glutamine is usually replaced by a dipeptide such as alanyl-glutamine to limit ammonia. Trace metals matter more than their concentrations suggest - manganese shifts galactosylation, copper shifts lactate metabolism. Media are filtered at 0.1 micron and protected from light, because photodegradation of riboflavin and tryptophan generates growth-inhibitory species.</p>
`,
      },
      {
        title: "Seed Train, Bioreactor Modes and Process Control",
        duration: 28,
        content: `
<h2>Seed Train, Bioreactor Modes and Process Control</h2>
<p>A frozen vial and a 2000 L bioreactor are five orders of magnitude apart. How you cross that gap, and how you run the vessel, sets titre and quality.</p>
<h3>The seed train</h3>
<p>A WCB vial holds on the order of ten million cells; a production bioreactor is inoculated at 0.3 to 0.5 million cells per millilitre. The path runs vial to shake flask, to rocking-motion bag, to N-2 and N-1 seed bioreactors, to production. Each step is a fivefold to tenfold expansion taking three to four days at a doubling time near thirty hours. Passage a culture below about ninety per cent viability, or beyond the passage number where stability was demonstrated, and the line drifts. High-density N-1 perfusion is now common: the production vessel starts at several million cells per millilitre, removing days from the run.</p>
<h3>Batch, fed-batch and perfusion</h3>
<p>Batch loads everything at the start and ends when a nutrient runs out or lactate and ammonia accumulate; titres are correspondingly low. Fed-batch is the default for monoclonal antibodies - a twelve to eighteen day run with bolus or continuous feeds, routinely three to eight grams per litre. Its ceiling is osmolality: feeding drives the culture past 400 milliosmoles per kilogram, where the cells stop rewarding you. Perfusion exchanges medium continuously while retaining cells on an alternating tangential flow device, holding forty to eighty million cells per millilitre. It suits unstable products because residence time at thirty-seven degrees Celsius is hours, not days. The honest cost is media consumption, sieving losses, more instrumentation, and a thirty-day run in which one contamination event destroys the campaign.</p>
<h3>What is actually controlled</h3>
<p>Dissolved oxygen is held near thirty to forty per cent of air saturation by a cascade that raises agitation first, then oxygen sparge. pH is held in a narrow band with a deadband, corrected down by carbon dioxide sparge and up by base. Temperature sits at thirty-seven degrees Celsius during growth and is often shifted to thirty-one to thirty-three degrees to arrest growth and extend specific productivity. The standing tension is oxygen transfer against shear: most damage comes not from the impeller but from bubbles rupturing at the surface, and fine spargers give the best transfer and the worst bubbles. Pluronic F-68 is not optional. Stripping carbon dioxide, meanwhile, needs large bubbles and high gas throughput - the opposite requirement.</p>
`,
      },
      {
        title: "Scale-Up, Harvest and the Handoff Downstream",
        duration: 22,
        content: `
<h2>Scale-Up, Harvest and the Handoff Downstream</h2>
<p>Scale-up is a decision about which variable you refuse to change, because you cannot hold them all constant at once.</p>
<h3>Why geometric similarity is not enough</h3>
<p>Keep vessel proportions identical and hold power per unit volume constant, and impeller tip speed rises with scale. Hold tip speed constant instead, and power per unit volume falls. Mixing time cannot be held constant at all - it goes from a few seconds in a two-litre vessel to a minute or more in two thousand litres. Meanwhile the surface-to-volume ratio drops, so headspace stripping of carbon dioxide becomes ineffective, and hydrostatic head at the base of a tall vessel raises dissolved carbon dioxide further. The result is a large reactor with real gradients: a base addition point where pH spikes locally, a sparger zone that is oxygen rich, and a bulk that is neither.</p>
<h3>The criteria used in practice</h3>
<p>Oxygen transfer rate is kLa multiplied by the difference between saturation and actual dissolved oxygen concentration. kLa is a function of power per unit volume and superficial gas velocity, not of agitation alone - which is why matching kLa across scales usually means changing the sparger rather than only the impeller speed. Most mammalian processes are transferred on constant power per unit volume, roughly twenty to sixty watts per cubic metre, with tip speed capped near two metres per second and mixing time checked as a constraint rather than matched as a target. A scale-down model, such as a two hundred and fifty millilitre automated bioreactor, is qualified against large-scale data before it is trusted.</p>
<h3>Harvest and the handoff</h3>
<p>Harvest criteria are set in advance: a viability floor, usually between sixty and eighty per cent, with day and product quality triggers. The reason to stop early is that lysing cells release host cell protein, DNA, proteases and sialidases into the broth, degrading the product and loading the purification train. Clarification at scale is normally disc-stack centrifugation followed by depth filtration and a 0.2 micron filter; very dense cultures may add flocculation. Perfusion sidesteps this by harvesting cell-free permeate continuously.</p>
<p>What upstream owes downstream is specific: harvest turbidity, host cell protein and DNA load, bioburden, and a quality profile covering aggregate, charge variants and glycans. Hold time and temperature for harvested cell culture fluid are validated parameters, not conveniences.</p>
`,
      },
    ],
    quiz: {
      title: "Upstream Processing: Cell Culture and Bioreactors - Knowledge Check",
      questions: [
        {
          text: "A manufacturer holds both a Master Cell Bank and a Working Cell Bank rather than a single bank. What is the principal reason for the two-tier arrangement?",
          options: [
            "The Master Cell Bank receives the full characterisation package once, and routine manufacturing draws only on the Working Cell Bank, so the irreplaceable Master Cell Bank is preserved for the licensed life of the product",
            "The two banks must be derived from two independent clones so that genetic drift in one can be detected by comparison against the other",
            "The Working Cell Bank is banked at a higher passage number so that cells arrive pre-adapted to the production bioreactor and no seed train is required",
            "The Master Cell Bank supports clinical supply and the Working Cell Bank supports commercial supply, keeping the two regulatory submissions separate",
          ],
          correctAnswer: "The Master Cell Bank receives the full characterisation package once, and routine manufacturing draws only on the Working Cell Bank, so the irreplaceable Master Cell Bank is preserved for the licensed life of the product",
          explanation: "The MCB is finite, fully characterised under ICH Q5A(R2), Q5B and Q5D, and cannot be remade. The WCB exists to absorb routine draw-down so the MCB is not consumed.",
        },
        {
          text: "A fusion protein degrades measurably after roughly two days at thirty-seven degrees Celsius in culture supernatant. Which bioreactor mode addresses this most directly, and at what cost?",
          options: [
            "Perfusion, because the cell retention device removes proteases from the culture; the cost is a much lower achievable viable cell density",
            "Batch, because the run is short and no feed additions are made; the cost is a substantially lower final titre",
            "Perfusion, because continuous media exchange gives the product a short residence time in the vessel; the cost is much higher media consumption, sieving losses and a long run in which one contamination event destroys the campaign",
            "Fed-batch with an extended feed schedule, because concentrated feeds stabilise the product in solution; the cost is rising osmolality",
          ],
          correctAnswer: "Perfusion, because continuous media exchange gives the product a short residence time in the vessel; the cost is much higher media consumption, sieving losses and a long run in which one contamination event destroys the campaign",
          explanation: "Perfusion removes product from the vessel within hours rather than days, which is the direct remedy for thermal or enzymatic instability. Its retention device holds cells back rather than selectively removing proteases, and it supports higher cell densities than fed-batch, not lower.",
        },
        {
          text: "A fed-batch process is transferred from 200 L to 2000 L in a geometrically similar vessel, holding power per unit volume constant. Which problem is most likely to appear at the larger scale?",
          options: [
            "Impeller tip speed falls sharply, so cells sediment and the base of the vessel becomes oxygen limited",
            "kLa collapses because it is inversely proportional to working volume whenever power per unit volume is held constant",
            "Shear from the impeller becomes the dominant cause of cell death, since power input scales with the cube of impeller diameter",
            "Dissolved carbon dioxide accumulates and mixing time lengthens, producing pH and nutrient gradients that the smaller vessel never exhibited",
          ],
          correctAnswer: "Dissolved carbon dioxide accumulates and mixing time lengthens, producing pH and nutrient gradients that the smaller vessel never exhibited",
          explanation: "Larger vessels have a lower surface-to-volume ratio and greater hydrostatic head, so carbon dioxide stripping worsens while mixing time grows from seconds to a minute or more. At constant power per unit volume tip speed rises rather than falls, and cell damage remains dominated by bubble rupture rather than impeller shear.",
        },
        {
          text: "A fed-batch run reaches day fourteen with viability at sixty-five per cent and titre still creeping upward. The team harvests rather than extending to day sixteen. What is the strongest process rationale?",
          options: [
            "Viability below seventy per cent prevents a disc-stack centrifuge from forming a stable solids discharge, so clarification cannot proceed",
            "Lysing cells release host cell protein, DNA, proteases and sialidases into the broth, degrading product quality and increasing the load on clarification and purification",
            "Glucose in the feed is necessarily exhausted by day fourteen, and further feeding would push osmolality beyond the point at which cells arrest",
            "Health Canada limits mammalian fed-batch runs to fourteen days unless an extension is filed as a post-approval change",
          ],
          correctAnswer: "Lysing cells release host cell protein, DNA, proteases and sialidases into the broth, degrading product quality and increasing the load on clarification and purification",
          explanation: "Late-run lysis turns a rising titre into a worse harvest, because released proteases and sialidases attack the product while the extra debris burdens downstream. There is no fourteen-day regulatory limit, and centrifugation still works at low viability.",
        },
      ],
    },
  },
  {
    code: "CST-DSP-201",
    title: "Downstream Processing: Purification and Chromatography",
    description:
      "This course walks the downstream train of a monoclonal antibody process, from clarified harvest to formulated bulk. You will be able to explain what each chromatography mode separates on, justify the step order, and reason about viral clearance, resin lifetime and yield-purity trade-offs.",
    topic: "Biomanufacturing - USP/DSP",
    provider: "CASTL",
    delivery: "Asynchronous",
    duration: 75,
    creditCost: 100,
    isSpecial: false,
    tags: ["downstream processing", "chromatography", "protein a", "viral clearance", "purification", "mab platform"],
    modules: [
      {
        title: "Why Downstream Owns the Cost of Goods",
        duration: 20,
        content: `
<h2>Why Downstream Owns the Cost of Goods</h2>
<p>Upstream makes the molecule; downstream decides what it costs and whether it can be released. Fed-batch monoclonal antibody titres have risen from well under 1 g/L in the 1990s to a routine 3-8 g/L today, so the mass burden has shifted decisively into purification. Downstream consumables scale with product mass and with buffer volume, not with how good the cell line is.</p>
<h3>Where the money actually goes</h3>
<p>Resins, membranes, filters and buffers dominate the non-labour cost of goods for a typical mAb. Protein A resin is usually the single largest line item: a packed litre costs many thousands of dollars, which is only tolerable if the resin survives well past a hundred cycles. Buffers are the quiet cost. One 2000 L bioreactor batch can consume tens of thousands of litres of buffer across the train, and that drives water-for-injection capacity, hold-vessel count and floor space more than any single column does.</p>
<h3>Yield compounds, it does not average</h3>
<p>Step yields multiply. Six steps at 90 per cent give an overall yield of 53 per cent, and no individual step looks bad on its own. This is why downstream teams argue over two percentage points that would be shrugged off elsewhere. It also explains a rule practitioners internalise quickly: a loss late in the train is far more expensive than the same loss at capture, because every preceding processing cost has already been spent on the material being discarded.</p>
<h3>Clarification: reaching a loadable stream</h3>
<p>Packed beds are unforgiving of particulates, so harvest is clarified before it ever sees a column. Continuous disc-stack centrifugation removes whole cells and coarse debris, but it shears cells and leaves fine colloids behind. Depth filtration then does the real work: graded cellulose and diatomaceous earth media that retain particles by size and also adsorb DNA, host cell protein and lipid through charge interactions. A 0.2 micron bioburden reduction filter follows. The practical acceptance criterion is turbidity, typically single-digit NTU into capture, because a hazy load fouls the column, raises back pressure and shortens resin life. High cell density with low end-of-run viability is the usual reason clarification underperforms.</p>
`,
      },
      {
        title: "The Monoclonal Antibody Platform, Step by Step",
        duration: 30,
        content: `
<h2>The Monoclonal Antibody Platform, Step by Step</h2>
<p>The mAb platform exists because IgG molecules resemble one another enough that a single sequence of unit operations works for most of them. Knowing why each step sits where it does matters far more than memorising the order.</p>
<h3>Protein A capture</h3>
<p>Protein A ligands bind the Fc region of IgG at the CH2-CH3 interface, which makes capture close to product-specific in one step. Modern recombinant, alkali-tolerant ligands give dynamic binding capacities of roughly 30-60 g/L at 10 per cent breakthrough, and loading is set by residence time, commonly 4-6 minutes, rather than by linear velocity alone. Intermediate washes strip weakly associated host cell protein before elution at about pH 3.3-3.6 in acetate, citrate or glycine. A single capture column typically takes host cell protein from the order of 100000 ppm in clarified harvest down to hundreds of ppm and removes most residual DNA. It also concentrates the stream, which is why every downstream vessel, filter and buffer volume is smaller and cheaper.</p>
<h3>Low-pH viral inactivation</h3>
<p>The Protein A eluate arrives already near pH 3.5, so a hold at pH 3.4-3.7 for 30-60 minutes at controlled temperature costs almost nothing to add. It inactivates enveloped viruses by irreversibly denaturing the envelope glycoproteins needed for attachment and fusion, not by dissolving the lipid bilayer as detergents do, with murine leukaemia virus as the standard model. pH, hold time, temperature and protein concentration are validated parameters, not operator preferences. The real constraint is aggregation: antibodies are unstable at low pH, so the hold is set where clearance is demonstrated and aggregate growth stays acceptable. Neutralisation to pH 5-7 follows immediately, and the precipitate that forms on neutralisation is removed by depth filtration.</p>
<h3>Polishing, viral filtration and UF/DF</h3>
<p>Polishing removes aggregates, residual host cell protein and DNA, leached Protein A and product variants. Anion exchange is normally run in flow-through, while cation exchange, hydrophobic interaction or a multimodal resin handles aggregates in bind-and-elute. A small-virus-retentive filter of roughly 20 nm sits after polishing, where the stream is cleanest and flux decay least likely. Finally, tangential flow ultrafiltration on a 30 kDa membrane concentrates the antibody and six to ten diavolumes of diafiltration exchange it into formulation buffer. At high final concentrations, Donnan effects shift excipient levels in the retentate, so targets are set on the retentate as it will actually be, not on the diafiltration buffer.</p>
`,
      },
      {
        title: "Chromatography Modes, Resin Life and Viral Clearance",
        duration: 25,
        content: `
<h2>Chromatography Modes, Resin Life and Viral Clearance</h2>
<p>Contaminants differ from the product in more than one physical property, and a robust train exploits several of those differences at once.</p>
<h3>What each mode separates on</h3>
<p>Affinity separates on biospecific recognition, such as Protein A binding the Fc. Ion exchange separates on net surface charge at the operating pH relative to the isoelectric point, so pH and conductivity control it. Hydrophobic interaction separates on exposed hydrophobic patches, promoted by kosmotropic salt such as ammonium sulfate and eluted by lowering salt, the reverse of an ion exchange gradient. Multimodal resins combine charge and hydrophobic character in one ligand, so they still work at conductivities that defeat a plain ion exchanger. Size exclusion separates on hydrodynamic radius without binding, but it dilutes the product and loads only a few per cent of column volume, so it is rare at scale.</p>
<h3>Bind-and-elute versus flow-through</h3>
<p>In bind-and-elute, capacity is set by how much product the resin holds. In flow-through the product passes while impurities bind, so capacity is set by the impurity load, which in a post-capture mAb stream is small. That is why anion exchange polishing of a mAb (isoelectric point typically 8-9) runs at pH 7-8 and low conductivity: the antibody is net positive and passes, while DNA, endotoxin, acidic host cell protein and virus bind. Flow-through steps run fast, need no elution buffer, and suit single-use membrane adsorbers.</p>
<h3>Resin lifetime, cleaning and carryover</h3>
<p>Cleaning-in-place with 0.1-0.5 M sodium hydroxide is standard for alkali-stable resins; older Protein A ligands need milder agents. Lifetime claims rest on small-scale studies that cycle resin past the claimed number, then assess capacity loss, ligand leaching, cleaning effectiveness and carryover between cycles. Carryover matters most in multi-product facilities, where a column must be shown not to transfer material between campaigns.</p>
<h3>Orthogonal viral clearance and the yield-purity trade</h3>
<p>ICH Q5A(R2), adopted in Canada by Health Canada, expects clearance from mechanistically independent steps: one inactivation step, usually the low-pH hold, and one removal step, usually nanofiltration. Log reduction values may be summed only across genuinely orthogonal steps; two low-pH holds do not add, and contributions below roughly 1 log are not counted. Every step is also a yield decision: tightening a cation exchange peak cut to meet an aggregate specification discards good product at the peak edges, and the question is always whether that purity is worth the mass lost.</p>
`,
      },
    ],
    quiz: {
      title: "Downstream Processing: Purification and Chromatography - Knowledge Check",
      questions: [
        {
          text: "In a typical monoclonal antibody process, why is the anion exchange polishing step usually run in flow-through mode rather than bind-and-elute?",
          options: [
            "At pH 7-8 and low conductivity the antibody is net positively charged and passes through, while DNA, endotoxin, acidic host cell protein and virus bind",
            "Anion exchange resins have too little dynamic binding capacity for an antibody to be captured economically at commercial scale",
            "Flow-through operation is required because antibodies denature on contact with quaternary amine ligands",
            "Eluting an antibody from anion exchange would need a salt concentration high enough to precipitate the product",
          ],
          correctAnswer: "At pH 7-8 and low conductivity the antibody is net positively charged and passes through, while DNA, endotoxin, acidic host cell protein and virus bind",
          explanation: "With a typical mAb isoelectric point of 8-9, operating below the pI leaves the product net positive so it does not bind, while acidic impurities do. Capacity is therefore set by impurity load, not by product mass.",
        },
        {
          text: "Under the orthogonal clearance principle, when may the log reduction values of two viral clearance steps be added together?",
          options: [
            "When the two steps use the same clearance mechanism, so that the two results are directly comparable",
            "When each step individually achieves at least 6 logs of clearance",
            "When the two steps act by mechanistically different means, for example one inactivation step and one removal step",
            "When the two steps are placed consecutively, with no chromatography step between them",
          ],
          correctAnswer: "When the two steps act by mechanistically different means, for example one inactivation step and one removal step",
          explanation: "Additivity assumes independence, so a low-pH inactivation hold and a nanofiltration removal step may be summed. Two steps sharing a mechanism can fail for the same reason, and contributions below about 1 log are not counted.",
        },
        {
          text: "A purification train has six steps, each with a 90 per cent step yield. What is the approximate overall yield, and where does a given percentage loss cost the most?",
          options: [
            "About 90 per cent overall, because step yields average across the train rather than multiply",
            "About 53 per cent overall, and a loss costs most at the late steps, because all preceding processing cost has already been spent on that material",
            "About 40 per cent overall, and a loss costs the same wherever in the train it occurs",
            "About 53 per cent overall, and a loss costs most at capture, because the largest product mass is present at that point",
          ],
          correctAnswer: "About 53 per cent overall, and a loss costs most at the late steps, because all preceding processing cost has already been spent on that material",
          explanation: "Step yields multiply, so 0.9 to the sixth power is about 0.53. Material discarded at ultrafiltration has already absorbed the cost of capture, inactivation, polishing and viral filtration.",
        },
        {
          text: "Why is the low-pH viral inactivation hold placed immediately after Protein A elution, and what limits the hold conditions?",
          options: [
            "Low pH strips leached Protein A from the product, and the hold is limited by the buffering capacity of the citrate used for elution",
            "The hold must precede any chromatography to protect the resins from viral contamination, and it is limited by the resin manufacturer pH specification",
            "Low pH is needed to solubilise aggregates formed on the column, and the hold is limited by the temperature the product can tolerate",
            "The eluate is already near pH 3.5, so no extra acidification is needed, and hold time and protein concentration are limited by antibody aggregation",
          ],
          correctAnswer: "The eluate is already near pH 3.5, so no extra acidification is needed, and hold time and protein concentration are limited by antibody aggregation",
          explanation: "The step is essentially free because Protein A elution already delivers the stream at low pH. Antibodies are unstable there, so time, temperature and concentration are set where clearance is proven but aggregate growth stays acceptable.",
        },
      ],
    },
  },
  {
    code: "SEN-BOOT-101",
    title: "Biomanufacturing Skills Bootcamp",
    description:
      "Prepares recent graduates and career changers for entry-level GMP manufacturing roles through online theory and scheduled on-campus laboratory days. Participants complete batch documentation to GMP standard, gown for cleanroom entry, operate a bench bioreactor and take in-process samples aseptically.",
    topic: "Biomanufacturing - General",
    provider: "Seneca Polytechnic",
    delivery: "Blended",
    duration: 480,
    creditCost: 100,
    isSpecial: true,
    tags: ["gmp", "aseptic technique", "bioreactor", "bootcamp", "cleanroom", "career transition"],
    modules: [
      {
        title: "Programme Orientation and GMP Foundations",
        duration: 150,
        content: `
<h2>Programme Orientation and GMP Foundations</h2>
<p>This bootcamp is a blended programme. The online modules are completed in your own time within the cohort window, and the laboratory sessions are attended in person on Seneca Polytechnic's campus on fixed, published dates. It is not self-paced. Cohorts open and close on set dates, and a participant who misses a laboratory day defers to the next cohort rather than catching up remotely.</p>
<h3>Who the programme is for</h3>
<p>The intake is recent graduates in biology, biotechnology, chemistry or chemical engineering, and career changers arriving from adjacent technical work - food and beverage production, hospital laboratories, water treatment, quality roles in other regulated industries. No prior GMP experience is assumed. What is assumed is comfort with arithmetic, units and dilutions, because a manufacturing associate calculates feed volumes and dilution factors on the floor, under time pressure, with a second person verifying the result.</p>
<h3>What GMP actually requires</h3>
<p>In Canada, drug fabrication is regulated under Part C, Division 2 of the Food and Drug Regulations, and Health Canada sets out its expectations in the Good Manufacturing Practices Guide for Drug Products, GUI-0001. A site that fabricates, packages, tests, imports or distributes a drug holds a Drug Establishment Licence. The practical consequence for a new associate is blunt: every action on the floor is performed to an approved written procedure and recorded as it happens. Work that is not recorded did not happen, and a lot that cannot be reconstructed from its batch record cannot be released.</p>
<h3>Attendance, PPE and cleanroom entry</h3>
<p>Laboratory days require full attendance; there is no partial credit for a half day. Participants supply their own closed, non-porous safety footwear. Safety eyewear, laboratory coats, gloves and cleanroom garments are provided. Before entering the classified area you complete a gowning demonstration and a short health declaration - anyone with an open wound, an active respiratory infection or a shedding skin condition is excluded from the cleanroom that day and works at an alternative station. Cosmetics, jewellery, watches and nail varnish are removed before gowning. These are not etiquette rules. People are the dominant source of viable particles in a cleanroom, and the gown exists to keep the operator's skin, hair and clothing separated from the product.</p>
`,
      },
      {
        title: "Online Component: Documentation and Process Theory",
        duration: 150,
        content: `
<h2>Online Component: Documentation and Process Theory</h2>
<p>The online component front-loads everything that can be learned before you touch equipment, so that laboratory time is spent on your hands rather than on slides. Expect short assessed sections rather than one long sitting.</p>
<h3>Good documentation practice</h3>
<p>Records are made contemporaneously, in permanent ink, by the person who did the work. The recognised criteria are ALCOA+: attributable, legible, contemporaneous, original and accurate, then complete, consistent, enduring and available. Corrections are made with a single line through the original entry, leaving it readable, followed by the correct value, the initials of the person making the change, the date and a short reason. Never overwrite a digit, never use correction fluid, never sign a step at the end of a shift that you performed hours earlier. A blank field is an unanswered question to an auditor; if a step genuinely does not apply, write N/A and initial it.</p>
<h3>The document hierarchy</h3>
<p>Policies sit above standard operating procedures, which sit above the master batch record; a copy of that master is issued for each lot and becomes the executed batch record once it is filled in. Forms and logbooks capture what those procedures demand. Changes to any controlled document move through change control; departures from them are deviations, and every deviation is recorded and investigated, with formal CAPA reserved for events that meet a defined threshold. Learn the distinctions early: a deviation describes what happened, the investigation explains why, a correction deals with the batch in front of you, and a corrective action eliminates the cause so it cannot recur.</p>
<h3>Process theory</h3>
<p>The online modules walk the upstream-to-downstream flow for a monoclonal antibody: thaw of a working cell bank vial, seed expansion through shake flasks and seed bioreactors, fed-batch production culture in CHO cells over roughly twelve to fourteen days, harvest by centrifugation or depth filtration, Protein A capture chromatography, low-pH viral inactivation, polishing chromatography, ultrafiltration and diafiltration into the formulation buffer, and sterile filtration through a 0.2 micron filter. You also cover the utilities that make all of it possible - water for injection, clean steam, HVAC and room pressure cascades - because these are the systems that drift quietly and take a batch with them.</p>
`,
      },
      {
        title: "Laboratory Days: Aseptic Practice, Bioreactors and Analysis",
        duration: 180,
        content: `
<h2>Laboratory Days: Aseptic Practice, Bioreactors and Analysis</h2>
<p>Laboratory sessions are attended in person on campus, on the dates published for your cohort. Arrive with the online modules finished; instructors assume the theory is done and begin at the bench.</p>
<h3>Aseptic handling</h3>
<p>You gown to the standard required for the classified area and work under unidirectional airflow in a biological safety cabinet. The idea to absorb is first air: the air leaving a HEPA filter is clean until something interrupts it, so nothing - not a hand, not a pipette body, not a bottle - passes between the filter and an open container. Movements are slow, because rapid motion generates turbulence. Everything entering the cabinet is wiped with 70 per cent isopropyl alcohol and given its full contact time.</p>
<h3>Bioreactor operation</h3>
<p>You set up, calibrate and run a bench-scale stirred-tank bioreactor. Dissolved oxygen is held by a cascade from agitation to sparge gas, pH by carbon dioxide and base addition, temperature by the jacket. The pH probe is calibrated against two buffers before sterilisation and checked for offset afterwards. You learn why working volume is not total volume, why headspace matters for foam, and why anti-foam is dosed sparingly - it carries through the process and fouls downstream filters.</p>
<h3>In-process sampling and analysis</h3>
<p>Samples are drawn aseptically through a dedicated sample line. That line holds stagnant liquid in its dead leg, so a flush volume is drawn and discarded first; skip it and you measure yesterday's culture. Containers are labelled at the point of collection, never afterwards. You then run what an associate runs daily: viable cell density and viability by trypan blue exclusion, glucose, lactate, glutamine and ammonium on a bench analyser, osmolality, and total protein by absorbance at 280 nanometres, which is not the antibody titre. You plot the results and interpret them - a lactate curve that turns downward mid-culture is usually a metabolic shift, not an instrument fault - unless viability falls with it.</p>
<h3>Assessment and outcome</h3>
<p>Assessment has three parts: the online knowledge checks, a documentation exercise marked against good documentation practice, and a practical observation in which an instructor scores gowning, aseptic technique, bioreactor setup and sampling against a checklist. Participants who pass all three leave with a certificate of completion, a signed skills checklist they can put in front of an employer, and the batch documentation they executed themselves during the laboratory days.</p>
`,
      },
    ],
    quiz: {
      title: "Biomanufacturing Skills Bootcamp - Knowledge Check",
      questions: [
        {
          text: "A participant has finished every online module but cannot attend the laboratory day scheduled for their cohort. What does the structure of this programme require?",
          options: [
            "They complete a virtual laboratory simulation in place of the on-campus session and receive the same certificate.",
            "They defer the laboratory component to a later cohort, because the laboratory days are attended in person on campus on fixed dates and cannot be completed remotely.",
            "They receive the certificate on the strength of the online modules, since the laboratory day is an optional enrichment activity.",
            "They submit a written account of the laboratory procedures for marking instead of attending.",
          ],
          correctAnswer: "They defer the laboratory component to a later cohort, because the laboratory days are attended in person on campus on fixed dates and cannot be completed remotely.",
          explanation: "The bootcamp is blended and cohort-based rather than self-paced. Online modules are completed within the cohort window, but the laboratory component is attended in person on published dates, so a missed laboratory day is deferred to the next cohort.",
        },
        {
          text: "While completing an executed batch record you enter the wrong figure in a field. How is the correction made?",
          options: [
            "Obliterate the incorrect figure so that only the correct value can be read, then initial and date the field.",
            "Leave the field as written and record the correct value in a deviation report at the end of the shift.",
            "Apply correction fluid over the entry, write the correct value on top and have a supervisor countersign it.",
            "Draw a single line through the entry so it stays readable, write the correct value beside it, then initial, date and give a brief reason.",
          ],
          correctAnswer: "Draw a single line through the entry so it stays readable, write the correct value beside it, then initial, date and give a brief reason.",
          explanation: "Good documentation practice requires the original entry to remain legible so the record can be reconstructed. A single-line strike-through with initials, date and reason preserves that history, whereas obliterating or covering an entry destroys it.",
        },
        {
          text: "Why is a flush volume drawn and discarded before an in-process sample is taken from a bioreactor sample line?",
          options: [
            "The first volume through the line carries residual sterilant that would kill the cells in the sample.",
            "The flush warms the sample line to culture temperature so that an accurate reading can be taken.",
            "The dead leg of the sample line holds stagnant liquid that is no longer representative of the bulk culture.",
            "The line holds air that would otherwise be drawn in with the sample and make the measured volume inaccurate.",
          ],
          correctAnswer: "The dead leg of the sample line holds stagnant liquid that is no longer representative of the bulk culture.",
          explanation: "Liquid sitting in the dead leg is older than the culture in the vessel, so measuring it reports an earlier time point. The flush clears that stagnant volume so the sample reflects the bulk culture at the moment it is drawn.",
        },
      ],
    },
  },
  {
    code: "BTC-LIVE-101",
    title: "Career Insights Live: Ask a Hiring Manager",
    description:
      "After this session you will be able to describe how an employer actually screens applications, from posting to shortlist, and explain why referrals convert. You will arrive with three specific questions prepared and a defined plan for the 48 hours afterwards.",
    topic: "Career Insights",
    provider: "BioTalent Canada",
    delivery: "Online (Synchronous)",
    duration: 60,
    creditCost: 100,
    isSpecial: false,
    tags: ["career insights", "hiring", "interviews", "networking", "job search"],
    modules: [
      {
        title: "Before the Session: How Hiring Actually Works",
        duration: 30,
        content: `
<h2>Before the Session: How Hiring Actually Works</h2><p>Read this before you join. The hour with the panel is yours to spend on questions, and a question is only as good as the preparation behind it. What follows is the employer's side of a process candidates only see from the outside.</p><h3>A posting is not a description of the job</h3><p>Most postings are assembled from a template by a recruiter or an HR generalist, amended by the hiring manager, then trimmed for length. The result describes a composite ideal who does not exist. Underneath it sits a manager with one or two concrete problems: a Health Canada submission going out in the autumn, an analytical method that keeps failing transfer, a cell line nobody has maintained since an analyst left. Read a posting for the problem it is trying to solve, and write to that.</p><h3>Applicant tracking systems, minus the folklore</h3><p>Most employers you apply to run an applicant tracking system - Workday, Greenhouse, Lever, BambooHR or similar. It does not score you out of ten and reject you, though a knockout question on the form will screen you out automatically. It parses your CV into fields, stores it, and lets a recruiter filter and search. Applications disappear for duller reasons: a two-column layout that parses into nonsense, contact details buried in a document header, or vocabulary the recruiter would never search on. If the posting says GMP and your CV says only manufacturing quality, you will not appear in that search.</p><h3>The arithmetic of a shortlist</h3><p>A mid-level scientist posting in Toronto, Montreal or Vancouver can draw several hundred applications inside a fortnight. A recruiter works through them at seconds each and builds a shortlist of roughly ten. On that first pass nobody is looking for a reason to hire you; they are looking for a reason to stop reading. That is arithmetic, not cruelty.</p><h3>Why referrals convert</h3><p>A referral changes who reads you and when. It reaches the manager rather than the queue, though you still apply through the system, and it carries an implicit reference from somebody the employer already pays. Referrals are a small share of applications and a disproportionate share of hires because they reduce risk, and in a twelve-person biotech a bad hire costs months. It is also the argument for treating this panel as the start of a relationship, not a lecture.</p>
`,
      },
      {
        title: "Asking Well, and the 48 Hours Afterwards",
        duration: 30,
        content: `
<h2>Asking Well, and the 48 Hours Afterwards</h2><p>This is the second half of your preparation for the live session. Bring three written questions and expect to ask one.</p><h3>What makes a question worth asking</h3><p>A good question is one only this person can answer. Asking which skills are in demand wastes the one resource the panel has that a careers page does not: their own experience of deciding. Ask about decisions, not advice. "When you last hired a regulatory associate, what made you keep a CV with no direct submission experience?" gets a real answer, because managers recall decisions precisely and give advice generically. Keep it to one sentence, with no preamble about your own background.</p><h3>What the employer side sees candidates get wrong</h3><ul><li><strong>Generic applications.</strong> A cover letter that would suit any employer signals a volume strategy and invites a volume response.</li><li><strong>No evidence of research.</strong> Answering why-this-organisation with the organisation's own boilerplate about an innovative pipeline. Naming a specific product, a recent Health Canada authorisation or a paper from the group puts you in a small minority.</li><li><strong>Being unable to explain your own work plainly.</strong> The most common failure and the most damaging. Candidates describe methods when the manager wants the problem, what you did, and what changed. Two minutes, no jargon, then depth on request.</li><li><strong>Treating the interview as an examination.</strong> It is a working conversation about whether the two of you could solve a problem together. Answering only what is asked, never asking anything back, and never saying you do not know but here is how you would find out, all read as performing rather than thinking.</li></ul><h3>The 48 hours after the session</h3><p>Momentum decays fast, so treat the two days afterwards as part of the session.</p><ol><li>Write down what the panel actually said, close to verbatim, the same evening. Memory paraphrases quickly into what you expected to hear.</li><li>Send a connection request within 48 hours with one sentence referencing something specific they said. No CV and no request attached.</li><li>Make one change to your CV or profile based on what you heard, that week. One change made beats five planned.</li><li>Ask two people already in your network who work where you want to work for a short conversation about their team - not for a job.</li><li>Write down whatever you did not understand. That list is your next learning objective.</li></ol>
`,
      },
    ],
    quiz: {
      title: "Career Insights Live: Ask a Hiring Manager - Knowledge Check",
      questions: [
        {
          text: "Why do qualified applicants most often fail to surface from an employer's applicant tracking system?",
          options: [
            "The system scores each CV against the posting and automatically rejects anything below a set threshold",
            "The CV parses badly or lacks the exact terms the recruiter searches on, so it is never retrieved",
            "The system discards all remaining applications as soon as a shortlist has been drawn up",
            "Applications submitted outside business hours are placed at the bottom of the recruiter's queue",
          ],
          correctAnswer: "The CV parses badly or lacks the exact terms the recruiter searches on, so it is never retrieved",
          explanation: "An applicant tracking system parses, stores and searches; it does not rank your CV and reject it on a score, and the only automatic screen-out is a knockout question you answer on the form. Two-column layouts, text boxes, details buried in a header, or writing manufacturing quality when the posting says GMP all keep a CV out of the recruiter's search results.",
        },
        {
          text: "Which question is most worth putting to a hiring manager during the live session?",
          options: [
            "A broad question about which technical skills are currently most in demand in the sector",
            "A question preceded by a short summary of your background so the panel has context",
            "A question about a specific hiring decision this manager has made and what tipped it",
            "A question whose answer is already on the employer's careers page, asked to show interest",
          ],
          correctAnswer: "A question about a specific hiring decision this manager has made and what tipped it",
          explanation: "Managers recall their own decisions precisely and give advice generically, so a decision-based question draws on the one thing the panel has that no careers page does. Preamble about yourself and generally answerable questions both waste the opportunity.",
        },
        {
          text: "What does this course recommend you do first in the 48 hours after the live session?",
          options: [
            "Write down what the panel actually said, close to verbatim, before memory paraphrases it",
            "Send your CV to each panellist with a note asking them to keep you in mind for openings",
            "Wait until a relevant role is posted before contacting anyone you met at the session",
            "Post a public summary of the session and tag the panellists so they notice your engagement",
          ],
          correctAnswer: "Write down what the panel actually said, close to verbatim, before memory paraphrases it",
          explanation: "Recall drifts within hours towards what you expected to hear, so capturing the panel's actual wording the same evening preserves the material you will use for follow-up. Contact should follow within 48 hours as one specific sentence, without a CV or a request attached.",
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
