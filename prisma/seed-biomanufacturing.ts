import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const modules = [
  {
    title: "What is Biomanufacturing?",
    duration: 12,
    content: `
<h2>Introduction to Biomanufacturing</h2>
<p>Biomanufacturing is the use of biological systems — living cells, microorganisms, enzymes, and biotechnology processes — to produce commercial products at scale. Unlike traditional chemical manufacturing, biomanufacturing harnesses nature's own machinery to create everything from life-saving medicines to sustainable materials.</p>

<h3>What Gets Made in Biomanufacturing?</h3>
<ul>
  <li><strong>Biopharmaceuticals</strong> — monoclonal antibodies, vaccines, insulin, gene therapies, and cell therapies</li>
  <li><strong>Industrial biologics</strong> — enzymes for food processing, detergents, and textiles</li>
  <li><strong>Biofuels and biochemicals</strong> — ethanol, biodiesel, bio-based plastics</li>
  <li><strong>Agricultural biologics</strong> — biopesticides, biofertilizers, animal health products</li>
  <li><strong>Food ingredients</strong> — fermentation-derived flavours, probiotics, plant-based proteins</li>
</ul>

<h3>Core Technologies</h3>
<p>Modern biomanufacturing relies on a convergence of disciplines:</p>
<ul>
  <li><strong>Cell culture &amp; fermentation</strong> — growing mammalian cells (CHO, HEK293) or microbial cultures (E. coli, yeast) in bioreactors</li>
  <li><strong>Upstream processing</strong> — media development, seed train expansion, bioreactor operation</li>
  <li><strong>Downstream processing</strong> — purification using chromatography, filtration, and centrifugation</li>
  <li><strong>Analytical sciences</strong> — characterizing product quality, potency, and safety</li>
  <li><strong>Gene editing &amp; synthetic biology</strong> — designing organisms or cell lines for optimal production</li>
</ul>

<h3>Why Biomanufacturing Matters</h3>
<p>Biomanufacturing is central to addressing humanity's greatest challenges. It enables production of medicines that cannot be made by chemistry alone, reduces reliance on fossil fuels, and creates more sustainable industrial processes. The COVID-19 pandemic demonstrated how critical domestic biomanufacturing capacity is to national security and public health.</p>

<blockquote><p><em>"Biomanufacturing is not a niche industry — it is the backbone of 21st-century medicine, agriculture, and sustainable chemistry."</em></p></blockquote>
`,
  },
  {
    title: "Canada's Biomanufacturing Landscape",
    duration: 10,
    content: `
<h2>Canada as a Biomanufacturing Nation</h2>
<p>Canada has a robust and growing biomanufacturing sector, with significant government investment and a world-class research ecosystem. The country's life sciences industry contributes over <strong>$10 billion annually</strong> to GDP and employs more than 60,000 people.</p>

<h3>Strategic Investments Post-Pandemic</h3>
<p>The COVID-19 pandemic exposed vulnerabilities in Canada's vaccine and therapeutic supply chains. In response, the federal government launched several landmark investments:</p>
<ul>
  <li><strong>National Biomanufacturing Strategy</strong> — $2.2 billion allocated to rebuild domestic biomanufacturing capacity</li>
  <li><strong>Biomedical Research Fund</strong> — Investments in research infrastructure and clinical manufacturing</li>
  <li><strong>Bio Manufacturing Network</strong> — Supporting regional hubs in Ontario, Quebec, BC, and Alberta</li>
  <li><strong>CBMN (Canadian Biomanufacturing Network)</strong> — Connecting academia, industry, and government</li>
</ul>

<h3>Key Sectors in Canada</h3>
<table style="width:100%; border-collapse: collapse; margin: 1rem 0;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Sector</th>
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Key Activities</th>
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Primary Hubs</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Biopharmaceuticals</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">mAbs, vaccines, cell/gene therapy</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Toronto, Montreal, Vancouver</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Agricultural Biotech</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Crop biotech, biopesticides, animal health</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Saskatoon, Guelph, Lethbridge</td>
    </tr>
    <tr>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Industrial Biotech</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Enzymes, biofuels, bio-based materials</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Edmonton, Ontario corridor</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Food Biotech</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Fermentation, probiotics, alt-proteins</td>
      <td style="padding:8px 12px; border:1px solid #e5e7eb;">Montreal, Toronto, Guelph</td>
    </tr>
  </tbody>
</table>

<h3>Competitive Advantages</h3>
<p>Canada's biomanufacturing sector benefits from several structural advantages:</p>
<ul>
  <li>World-class universities producing a deep talent pipeline (U of T, McGill, UBC, University of Waterloo)</li>
  <li>Proximity to US markets with harmonized regulatory frameworks</li>
  <li>National Research Council's (NRC) industrial biosciences programs</li>
  <li>Competitive SR&amp;ED (Scientific Research and Experimental Development) tax credits</li>
  <li>Strong public health institutions (PHAC, Health Canada) providing regulatory clarity</li>
</ul>
`,
  },
  {
    title: "Industry Hubs and Key Employers",
    duration: 10,
    content: `
<h2>Where Biomanufacturing Happens in Canada</h2>
<p>Biomanufacturing activity in Canada is concentrated in several regional clusters, each with distinct strengths, anchor institutions, and employer bases.</p>

<h3>Greater Toronto Area (Ontario)</h3>
<p>The GTA is Canada's largest biomanufacturing hub, home to dozens of multinational and domestic companies:</p>
<ul>
  <li><strong>Sanofi (Toronto)</strong> — One of the world's largest vaccine manufacturers, with significant fill-and-finish and biologics operations</li>
  <li><strong>Emergent BioSolutions (Winnipeg/Toronto)</strong> — CDMO with vaccine and biologics manufacturing</li>
  <li><strong>Connaught Laboratories (now part of Sanofi)</strong> — Historic vaccine manufacturer</li>
  <li><strong>Apotex Biologics</strong> — Biosimilar manufacturing</li>
  <li><strong>MaRS Discovery District</strong> — Hub for biotech startups and spinouts</li>
  <li><strong>Cyclica, Notch Therapeutics, AbCellera (satellite)</strong> — Growing cell/gene therapy cluster</li>
</ul>

<h3>Montreal (Quebec)</h3>
<p>Montreal has a deep pharmaceutical manufacturing heritage:</p>
<ul>
  <li><strong>Medicago (now closed, but legacy workforce)</strong> — Plant-based vaccine pioneer</li>
  <li><strong>Pfizer Canada</strong> — Regional headquarters and manufacturing</li>
  <li><strong>Johnson &amp; Johnson</strong> — Canadian operations</li>
  <li><strong>Invacare, Bausch Health</strong> — Diversified life sciences manufacturing</li>
  <li><strong>McGill and UdeM research hospitals</strong> — Academic biomanufacturing for clinical trials</li>
</ul>

<h3>Vancouver / BC Lower Mainland</h3>
<ul>
  <li><strong>AbCellera Biologics</strong> — Antibody discovery and manufacturing scale-up</li>
  <li><strong>Precision BioSciences, STEMCELL Technologies</strong> — Reagents, cell therapy tools</li>
  <li><strong>Zymeworks</strong> — Bispecific antibody engineering</li>
  <li><strong>QLT, Angiotech (legacy companies)</strong> — Drug delivery biologics</li>
</ul>

<h3>Saskatoon (Saskatchewan)</h3>
<p>Often called "Canada's Silicon Valley of agricultural biotech":</p>
<ul>
  <li><strong>VIDO (Vaccine &amp; Infectious Disease Organization)</strong> — Veterinary and human vaccine R&amp;D and manufacturing</li>
  <li><strong>National Research Council — Aquatic and Crop Resource Development</strong></li>
  <li><strong>Ag-West Bio</strong> — Industry association supporting over 100 companies</li>
  <li><strong>Canola crop biotech corridor</strong> — Multiple seed and trait companies</li>
</ul>

<h3>Edmonton / Alberta</h3>
<ul>
  <li><strong>Alberta Innovates</strong> — Government-funded industrial biotech programs</li>
  <li><strong>InVivo Therapeutics, Enwave</strong> — Emerging cell therapy and bioprocessing players</li>
  <li><strong>University of Alberta</strong> — Strong fermentation and enzyme research programs</li>
</ul>
`,
  },
  {
    title: "Research & Development Careers",
    duration: 12,
    content: `
<h2>R&D Career Pathways in Biomanufacturing</h2>
<p>Research and development is the engine that drives biomanufacturing innovation. R&D roles span from early discovery through process development and into clinical and commercial manufacturing support.</p>

<h3>Research Scientist / Principal Scientist</h3>
<p><strong>What they do:</strong> Design and execute experiments to characterize biological products, develop new production strains or cell lines, improve yields, and support innovation pipelines.</p>
<p><strong>Typical background:</strong> MSc or PhD in biochemistry, molecular biology, microbiology, chemical engineering, or related field.</p>
<p><strong>Key skills:</strong> Cell culture, molecular cloning, analytical techniques (HPLC, mass spectrometry, ELISA), data analysis, scientific writing.</p>
<p><strong>Salary range (Canada):</strong> $70,000 – $130,000+ depending on level and sector.</p>

<h3>Process Development Scientist</h3>
<p><strong>What they do:</strong> Optimize bioreactor conditions, media formulations, and purification processes to scale biologics from lab to manufacturing. Bridge between research and manufacturing.</p>
<p><strong>Typical background:</strong> BSc/MSc/PhD in bioprocessing, chemical engineering, biochemistry.</p>
<p><strong>Key skills:</strong> Bioreactor operation (bench to 2000L), DoE (design of experiments), statistical analysis, chromatography method development.</p>
<p><strong>Salary range:</strong> $75,000 – $120,000.</p>

<h3>Analytical Development Scientist</h3>
<p><strong>What they do:</strong> Develop, validate, and transfer assays that measure product quality, potency, purity, and safety. Critical for regulatory submissions.</p>
<p><strong>Key skills:</strong> Method development and validation per ICH guidelines, HPLC, CE, flow cytometry, bioassays, stability studies.</p>
<p><strong>Salary range:</strong> $70,000 – $115,000.</p>

<h3>Bioinformatics / Computational Biology</h3>
<p><strong>What they do:</strong> Analyze genomic, proteomic, and process data to guide strain development, product characterization, and manufacturing optimization.</p>
<p><strong>Key skills:</strong> Python/R, machine learning, genomics pipelines, statistical modelling.</p>
<p><strong>Salary range:</strong> $80,000 – $140,000.</p>

<h3>Career Progression Path</h3>
<p>A typical R&D career ladder in Canadian biomanufacturing:</p>
<ol>
  <li><strong>Research Associate</strong> (BSc/technician level) → $45,000 – $65,000</li>
  <li><strong>Scientist I/II</strong> (MSc or PhD entry) → $65,000 – $90,000</li>
  <li><strong>Senior Scientist</strong> → $90,000 – $120,000</li>
  <li><strong>Principal Scientist</strong> → $110,000 – $150,000</li>
  <li><strong>Associate Director / Director, R&D</strong> → $130,000 – $200,000+</li>
</ol>

<h3>Emerging R&D Areas to Watch</h3>
<ul>
  <li>Cell and gene therapy manufacturing (CAR-T, viral vectors)</li>
  <li>mRNA platform technology</li>
  <li>Continuous bioprocessing</li>
  <li>Synthetic biology and metabolic engineering</li>
  <li>AI-guided process optimization</li>
</ul>
`,
  },
  {
    title: "Manufacturing & Production Careers",
    duration: 12,
    content: `
<h2>Manufacturing & Production Roles</h2>
<p>Manufacturing professionals are responsible for running the systems that produce biologic products at scale. This is the operational heart of biomanufacturing — ensuring products are made safely, consistently, and efficiently.</p>

<h3>Manufacturing Associate / Operator</h3>
<p><strong>What they do:</strong> Execute upstream or downstream bioprocessing procedures according to Standard Operating Procedures (SOPs). Operate bioreactors, centrifuges, chromatography systems, and filtration equipment.</p>
<p><strong>Typical background:</strong> College diploma or BSc in biotechnology, chemical technology, or life sciences. Some companies offer internal training for candidates with hands-on science backgrounds.</p>
<p><strong>Key skills:</strong> GMP compliance, aseptic technique, equipment operation, batch record documentation, troubleshooting.</p>
<p><strong>Salary range:</strong> $45,000 – $70,000.</p>

<h3>Manufacturing Scientist / Senior Operator</h3>
<p><strong>What they do:</strong> Execute and optimize manufacturing procedures, train junior staff, lead troubleshooting investigations, support tech transfer activities.</p>
<p><strong>Salary range:</strong> $65,000 – $95,000.</p>

<h3>Manufacturing Supervisor / Manager</h3>
<p><strong>What they do:</strong> Oversee a manufacturing team, manage scheduling and shift operations, ensure GMP compliance, and lead continuous improvement initiatives.</p>
<p><strong>Typical background:</strong> BSc/MSc with 5–8 years experience, or proven leadership from within.</p>
<p><strong>Salary range:</strong> $90,000 – $130,000.</p>

<h3>Technical Operations Manager / Director</h3>
<p><strong>What they do:</strong> Oversee entire manufacturing operations, capital project planning, site master planning, and interface with regulatory agencies during inspections.</p>
<p><strong>Salary range:</strong> $130,000 – $200,000+.</p>

<h3>Upstream vs. Downstream Specializations</h3>
<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin:1rem 0;">
  <div style="background:#eff6ff; padding:1rem; border-radius:8px;">
    <strong>Upstream Processing</strong>
    <ul style="margin-top:0.5rem;">
      <li>Cell banking &amp; thawing</li>
      <li>Seed train expansion</li>
      <li>Fed-batch or perfusion bioreactor operation</li>
      <li>In-process sampling and testing</li>
      <li>Harvest (centrifugation, depth filtration)</li>
    </ul>
  </div>
  <div style="background:#f0fdf4; padding:1rem; border-radius:8px;">
    <strong>Downstream Processing</strong>
    <ul style="margin-top:0.5rem;">
      <li>Protein A / ion exchange chromatography</li>
      <li>Viral inactivation / filtration</li>
      <li>UF/DF (ultrafiltration / diafiltration)</li>
      <li>Bulk drug substance formulation</li>
      <li>Fill and finish operations</li>
    </ul>
  </div>
</div>

<h3>GMP: The Foundation of Manufacturing Careers</h3>
<p>Good Manufacturing Practice (GMP) is the regulatory framework governing pharmaceutical and biologic manufacturing. <strong>All manufacturing roles in biomanufacturing require GMP knowledge.</strong> Key elements include:</p>
<ul>
  <li>Batch record documentation and review</li>
  <li>Change control and deviation management</li>
  <li>Environmental monitoring and contamination control</li>
  <li>Equipment qualification and validation</li>
  <li>Health Canada and FDA inspection readiness</li>
</ul>
`,
  },
  {
    title: "Quality, Regulatory & Compliance Careers",
    duration: 12,
    content: `
<h2>Quality, Regulatory Affairs & Compliance</h2>
<p>In biomanufacturing, quality is not just a department — it is embedded in every aspect of production. Quality and regulatory professionals ensure that products are safe, effective, and compliant with Canadian and international regulations.</p>

<h3>Quality Control (QC) Analyst</h3>
<p><strong>What they do:</strong> Test raw materials, in-process samples, and finished products using validated analytical methods. Release or reject batches based on specification compliance.</p>
<p><strong>Key skills:</strong> HPLC, ELISA, flow cytometry, microbial testing, data integrity, LIMS (Laboratory Information Management Systems).</p>
<p><strong>Salary range:</strong> $50,000 – $80,000.</p>

<h3>Quality Assurance (QA) Specialist / Manager</h3>
<p><strong>What they do:</strong> Develop and maintain the Quality Management System (QMS). Review batch records, manage deviations and CAPAs (Corrective and Preventive Actions), conduct internal audits, and prepare for regulatory inspections.</p>
<p><strong>Typical background:</strong> BSc in life sciences + GMP training; certifications like ASQ CQA (Certified Quality Auditor) are valued.</p>
<p><strong>Salary range:</strong> $70,000 – $120,000.</p>

<h3>Regulatory Affairs Specialist / Associate Director</h3>
<p><strong>What they do:</strong> Prepare and submit regulatory dossiers to Health Canada, FDA, and EMA for product approvals. Interpret regulations, advise development teams, and manage product lifecycle regulatory changes.</p>
<p><strong>Key regulations:</strong> Canadian Food and Drug Regulations (Part C, Division 8), ICH guidelines (Q8, Q9, Q10, Q11), FDA 21 CFR Parts 210/211/600–680.</p>
<p><strong>Typical background:</strong> BSc/MSc + regulatory training; RAC (Regulatory Affairs Certification) from RAPS is highly valued.</p>
<p><strong>Salary range:</strong> $80,000 – $150,000+.</p>

<h3>Validation Specialist / Engineer</h3>
<p><strong>What they do:</strong> Qualify equipment (IQ/OQ/PQ), validate manufacturing processes, cleaning procedures, and analytical methods. Generate validation protocols and reports.</p>
<p><strong>Salary range:</strong> $75,000 – $110,000.</p>

<h3>Quality Systems Manager / Director, Quality</h3>
<p><strong>What they do:</strong> Lead the site QMS, manage the quality team, interface with Health Canada inspectors, and represent quality at the executive level.</p>
<p><strong>Salary range:</strong> $120,000 – $180,000.</p>

<h3>Key Regulatory Bodies in Canada</h3>
<ul>
  <li><strong>Health Canada — Biologics and Genetic Therapies Directorate (BGTD)</strong> — Regulates vaccines, blood products, cell/gene therapies</li>
  <li><strong>Health Canada — Office of Pharmaceutical Quality (OPQ)</strong> — Drug substance/product manufacturing compliance</li>
  <li><strong>PHAC (Public Health Agency of Canada)</strong> — Pathogen containment and biosafety compliance</li>
  <li><strong>CFIA (Canadian Food Inspection Agency)</strong> — Agricultural biologics, veterinary products</li>
</ul>

<h3>Career Tip</h3>
<p>Quality and regulatory careers offer excellent job security and are among the most transferable within biomanufacturing. Professionals with expertise in Health Canada, FDA, and EMA requirements are in high demand across Canada, the US, and internationally.</p>
`,
  },
  {
    title: "Engineering & Process Development Careers",
    duration: 12,
    content: `
<h2>Engineering Careers in Biomanufacturing</h2>
<p>Engineering roles in biomanufacturing range from designing new facilities to optimizing production equipment, maintaining critical systems, and driving process improvements. These are among the highest-demand and best-compensated roles in the sector.</p>

<h3>Bioprocess / Chemical Engineer</h3>
<p><strong>What they do:</strong> Develop and scale bioprocesses from lab to pilot to commercial scale. Model process performance, design experiments, and ensure robust manufacturing processes.</p>
<p><strong>Typical background:</strong> BEng/MEng in chemical engineering, bioengineering, or biochemical engineering.</p>
<p><strong>Key skills:</strong> Mass balances, bioreactor design, DoE, statistical process control, MATLAB, process simulation (Aspen, SuperPro Designer).</p>
<p><strong>Salary range:</strong> $80,000 – $130,000.</p>

<h3>Automation / Controls Engineer</h3>
<p><strong>What they do:</strong> Program and maintain process control systems (SCADA, DCS, PLC), design and validate automation solutions for bioreactors and purification systems, and ensure 21 CFR Part 11 / Annex 11 compliance for computerized systems.</p>
<p><strong>Key skills:</strong> PLC programming (Allen-Bradley, Siemens), SCADA systems (DeltaV, Wonderware), GAMP 5 validation.</p>
<p><strong>Salary range:</strong> $90,000 – $140,000.</p>

<h3>Facilities / Utilities Engineer</h3>
<p><strong>What they do:</strong> Design and maintain critical GMP utilities — purified water (PW), water for injection (WFI), clean steam, HVAC, compressed gases — and ensure cleanroom environments meet ISO classification requirements.</p>
<p><strong>Salary range:</strong> $85,000 – $125,000.</p>

<h3>Manufacturing Science & Technology (MSAT) Engineer</h3>
<p><strong>What they do:</strong> The bridge between R&D and manufacturing. Manage tech transfer projects, investigate manufacturing deviations, develop process characterization protocols, and support regulatory submissions with process data.</p>
<p><strong>This is one of the most sought-after roles in Canadian biomanufacturing.</strong></p>
<p><strong>Salary range:</strong> $90,000 – $145,000.</p>

<h3>Project / Capital Projects Engineer</h3>
<p><strong>What they do:</strong> Lead or manage capital projects for facility expansions, equipment installations, and new manufacturing lines. Coordinate with contractors, vendors, and internal stakeholders.</p>
<p><strong>Salary range:</strong> $95,000 – $150,000+.</p>

<h3>Engineering Manager / VP Engineering</h3>
<p><strong>Salary range:</strong> $130,000 – $200,000+</p>

<h3>In-Demand Engineering Specializations</h3>
<ul>
  <li><strong>Continuous manufacturing</strong> — Shift from batch to continuous bioprocessing</li>
  <li><strong>Single-use technology (SUT)</strong> — Design and qualification of single-use bioreactors and process equipment</li>
  <li><strong>Digital twin &amp; Industry 4.0</strong> — Virtual process models, predictive maintenance</li>
  <li><strong>Cell and gene therapy process engineering</strong> — Viral vector production, CAR-T manufacturing</li>
  <li><strong>Sustainability engineering</strong> — Reducing water, energy, and waste in biomanufacturing</li>
</ul>

<h3>Professional Credentials</h3>
<p>Engineering roles in Canadian biomanufacturing typically require or value:</p>
<ul>
  <li>P.Eng. designation from Engineers Canada (required for sign-off on major engineering deliverables)</li>
  <li>PMP (Project Management Professional) for project management roles</li>
  <li>Six Sigma / Lean certification for continuous improvement roles</li>
</ul>
`,
  },
  {
    title: "Business, Operations & Commercial Careers",
    duration: 10,
    content: `
<h2>Business & Commercial Careers</h2>
<p>Beyond the lab and manufacturing floor, biomanufacturing companies need skilled professionals in business development, supply chain, clinical operations, and commercial strategy. These roles are critical to turning scientific innovation into delivered patient value.</p>

<h3>Supply Chain & Procurement</h3>
<p><strong>What they do:</strong> Manage raw material sourcing, supplier qualification, inventory, and logistics for GMP materials. Biopharmaceutical supply chains are complex, highly regulated, and often global.</p>
<p><strong>Key skills:</strong> GMP supplier management, cold chain logistics, ERP systems (SAP), APICS CPIM or CSCP certifications valued.</p>
<p><strong>Salary range:</strong> $65,000 – $110,000.</p>

<h3>Business Development Manager</h3>
<p><strong>What they do:</strong> Identify and close partnerships, licensing agreements, contract manufacturing deals, and distribution arrangements. Often involves significant travel and relationship management.</p>
<p><strong>Typical background:</strong> Science degree + MBA, or science degree with commercial experience.</p>
<p><strong>Salary range:</strong> $90,000 – $160,000 + bonus.</p>

<h3>Clinical Operations / CRO Management</h3>
<p><strong>What they do:</strong> Manage clinical trial supply, coordinate with CROs (Contract Research Organizations), oversee study startup, and manage investigational product logistics.</p>
<p><strong>Salary range:</strong> $75,000 – $120,000.</p>

<h3>Medical Science Liaison (MSL)</h3>
<p><strong>What they do:</strong> Act as scientific experts connecting the company with key opinion leaders, physicians, and payers. Communicate complex clinical and scientific data to support product adoption.</p>
<p><strong>Typical background:</strong> PharmD, PhD, or MD with strong communication skills.</p>
<p><strong>Salary range:</strong> $100,000 – $160,000 + car allowance.</p>

<h3>Market Access & Health Economics</h3>
<p><strong>What they do:</strong> Develop reimbursement strategies for biologics, negotiate with provincial formularies and CADTH (Canada's Drug and Health Technology Agency), and build health economic models.</p>
<p><strong>Salary range:</strong> $95,000 – $145,000.</p>

<h3>Finance & Accounting (Life Sciences)</h3>
<p>Biomanufacturing companies, particularly in the development stage, require finance professionals who understand R&D accounting, SR&amp;ED tax credits, grant management, and milestone-based financing. CPA designation + life sciences experience is highly valued.</p>

<h3>Human Resources (Life Sciences HR)</h3>
<p>With the sector growing rapidly, HR professionals with experience recruiting scientists, engineers, and regulatory specialists are in high demand. Knowledge of GMP workforce requirements and technical talent markets is a key differentiator.</p>

<h3>Contract Development & Manufacturing Organizations (CDMOs)</h3>
<p>CDMOs like <strong>Lonza, Samsung Biologics, WuXi Biologics, Emergent BioSolutions, and Canadian CDMO startups</strong> offer diverse career paths across all business functions. Working at a CDMO provides exposure to multiple clients, products, and platforms simultaneously — excellent for rapid career development.</p>
`,
  },
  {
    title: "Education & Certification Pathways",
    duration: 10,
    content: `
<h2>How to Build Your Biomanufacturing Career: Education & Credentials</h2>
<p>One of the strengths of the Canadian biomanufacturing sector is the diversity of educational pathways. Whether you are entering directly from high school, pivoting from another field, or upgrading your credentials, there is a pathway for you.</p>

<h3>College Diplomas & Certificates</h3>
<p>College programs are an excellent entry point for manufacturing, QC, and technical operations roles:</p>
<ul>
  <li><strong>Seneca College</strong> — Biotechnology – Advanced, Biomedical Engineering Technology</li>
  <li><strong>Humber College</strong> — Biotechnology</li>
  <li><strong>George Brown College</strong> — Biotechnology Technologist</li>
  <li><strong>Algonquin College</strong> — Biotechnology</li>
  <li><strong>SAIT (Southern Alberta Institute of Technology)</strong> — Bioscience Technology</li>
  <li><strong>British Columbia Institute of Technology (BCIT)</strong> — Biotechnology, Bioscience Technology</li>
  <li><strong>Concordia University (continuing ed)</strong> — Biopharmaceutical Manufacturing certificates</li>
</ul>

<h3>Undergraduate Degrees (BSc / BEng)</h3>
<p>A bachelor's degree opens doors to Scientist I, Associate Scientist, and Engineering roles:</p>
<ul>
  <li>BSc in Biochemistry, Microbiology, Molecular Biology, Biotechnology — available at virtually all Canadian universities</li>
  <li>BEng in Chemical Engineering, Biomedical Engineering, Biosystems Engineering — University of Waterloo, U of T, UBC, Queen's, McGill, University of Alberta</li>
  <li>BSc in Pharmaceutical Sciences — UBC, Dalhousie</li>
</ul>

<h3>Graduate Degrees (MSc / PhD)</h3>
<p>Graduate training is required for most Scientist and Principal Scientist roles:</p>
<ul>
  <li>MSc/PhD in Biochemistry, Chemical Engineering, Bioprocessing at all major Canadian research universities</li>
  <li>Specialized programs: <strong>University of Waterloo</strong> (Chemical Engineering bioprocessing focus), <strong>UBC</strong> (Pharmaceutical Sciences), <strong>U of T</strong> (Institute of Biomaterials and Biomedical Engineering)</li>
</ul>

<h3>Professional Certifications (High ROI)</h3>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Certification</th>
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Issuing Body</th>
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Best For</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px 12px; border:1px solid #e5e7eb;">RAC (Regulatory Affairs Certification)</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">RAPS</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Regulatory Affairs professionals</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:8px 12px; border:1px solid #e5e7eb;">CQA / CQE (Quality Auditor/Engineer)</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">ASQ</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Quality professionals</td></tr>
    <tr><td style="padding:8px 12px; border:1px solid #e5e7eb;">P.Eng.</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Engineers Canada</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Engineering roles</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:8px 12px; border:1px solid #e5e7eb;">PMP</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">PMI</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Project managers</td></tr>
    <tr><td style="padding:8px 12px; border:1px solid #e5e7eb;">CPIM / CSCP</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">APICS</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Supply chain roles</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:8px 12px; border:1px solid #e5e7eb;">Six Sigma Black Belt</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">ASQ / IASSC</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Manufacturing / process improvement</td></tr>
  </tbody>
</table>

<h3>Short Courses & Online Learning</h3>
<ul>
  <li><strong>ISPE (International Society for Pharmaceutical Engineering)</strong> — GMP training, facility design courses</li>
  <li><strong>PDA (Parenteral Drug Association)</strong> — Bioprocessing and sterile manufacturing training</li>
  <li><strong>Bioprocessing Network</strong> — Canadian industry training programs</li>
  <li><strong>Coursera / edX</strong> — MIT, Johns Hopkins bioprocessing courses</li>
  <li><strong>NRC Industrial Research Assistance Program (IRAP)</strong> — Funding for employee training</li>
</ul>
`,
  },
  {
    title: "Salaries, Job Outlook & Getting Started",
    duration: 8,
    content: `
<h2>Salary Overview, Job Market Outlook & Your Next Steps</h2>

<h3>Canadian Biomanufacturing Salary Benchmarks (2024–2025)</h3>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Role Level</th>
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Annual Salary (CAD)</th>
      <th style="padding:8px 12px; text-align:left; border:1px solid #e5e7eb;">Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px 12px; border:1px solid #e5e7eb;">Entry (diploma/BSc, 0–2 yr)</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">$45,000 – $65,000</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Research Associate, Operator, QC Analyst</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:8px 12px; border:1px solid #e5e7eb;">Mid-level (BSc/MSc, 3–7 yr)</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">$70,000 – $110,000</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Scientist I/II, QA Specialist, Engineer</td></tr>
    <tr><td style="padding:8px 12px; border:1px solid #e5e7eb;">Senior (MSc/PhD, 7–15 yr)</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">$110,000 – $160,000</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Senior/Principal Scientist, Manager, Sr. Engineer</td></tr>
    <tr style="background:#f9fafb;"><td style="padding:8px 12px; border:1px solid #e5e7eb;">Director / VP</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">$150,000 – $250,000+</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Director of Manufacturing, VP Quality, CSO</td></tr>
    <tr><td style="padding:8px 12px; border:1px solid #e5e7eb;">C-Suite (CEO, COO, CMO)</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">$200,000 – $500,000+</td><td style="padding:8px 12px; border:1px solid #e5e7eb;">Often includes equity in growth-stage companies</td></tr>
  </tbody>
</table>

<h3>Job Market Outlook</h3>
<p>The biomanufacturing labour market in Canada is strong and projected to grow significantly:</p>
<ul>
  <li>Canada's life sciences sector is expected to add <strong>20,000+ net new jobs by 2030</strong></li>
  <li>Cell and gene therapy manufacturing is the fastest-growing sub-sector with acute talent shortages</li>
  <li>The federal government's <strong>Biomanufacturing and Life Sciences Strategy</strong> identifies workforce development as a top priority</li>
  <li>QA/regulatory professionals and MSAT engineers are consistently among the hardest roles to fill</li>
  <li>Geographic mobility within Canada (especially to GTA and Vancouver) significantly increases opportunities</li>
</ul>

<h3>How to Get Your First Role</h3>
<ol>
  <li><strong>Build technical foundations</strong> — Take GMP, aseptic technique, and bioreactor courses even before graduation</li>
  <li><strong>Seek co-ops and internships</strong> — Many Canadian universities have mandatory co-op programs; biomanufacturing companies actively recruit co-op students</li>
  <li><strong>Join industry associations</strong> — BIOTECanada, Life Sciences Ontario, BC Life Sciences offer networking events</li>
  <li><strong>Attend career fairs</strong> — National Life Sciences Career Fair, BIO International Convention (if near you)</li>
  <li><strong>LinkedIn is essential</strong> — Most biomanufacturing hiring happens through LinkedIn; optimize your profile with technical keywords</li>
  <li><strong>Target CDMOs for entry-level</strong> — CDMOs like Lonza, Samsung, and emerging Canadian CDMOs hire broadly and provide excellent training</li>
  <li><strong>Consider government labs</strong> — NRC, PHAC, CFIA offer stable careers with excellent benefits and pension</li>
</ol>

<h3>Resources</h3>
<ul>
  <li><strong>BIOTECanada</strong> — biotech.ca — Industry association with job board and events</li>
  <li><strong>Life Sciences Ontario</strong> — lifesciencesontario.ca</li>
  <li><strong>Bioprocessing Network</strong> — Training and workforce development</li>
  <li><strong>Canada's Drug and Health Technology Agency (CADTH)</strong> — cadth.ca — For regulatory/HTA career paths</li>
  <li><strong>Glassdoor / LinkedIn / Indeed</strong> — Major job boards with active biomanufacturing listings</li>
</ul>

<div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:1rem 1.25rem; border-radius:0 8px 8px 0; margin-top:1.5rem;">
  <strong>Key Takeaway:</strong> Biomanufacturing offers one of the most stable, well-compensated, and socially impactful career trajectories in Canada's science and technology sector. Whether you are drawn to the science, engineering, quality, or business side — there is a role where your skills will be valued and your work will matter.
</div>
`,
  },
];

const assessmentData = {
  title: "Career Options in Biomanufacturing — Knowledge Check",
  description: "Test your understanding of Canadian biomanufacturing careers, key employers, and career pathways.",
  passingScore: 75,
  questions: [
    {
      text: "Which federal initiative committed $2.2 billion to rebuild Canada's domestic biomanufacturing capacity following the COVID-19 pandemic?",
      type: "multiple_choice",
      options: ["Canada Health Transfer", "National Biomanufacturing Strategy", "SR&ED Program", "Industrial Research Assistance Program"],
      correctAnswer: "National Biomanufacturing Strategy",
      points: 1, order: 1,
      explanation: "The National Biomanufacturing Strategy allocated $2.2 billion to rebuild domestic biomanufacturing capacity after pandemic-era supply chain vulnerabilities were exposed.",
    },
    {
      text: "Saskatoon, Saskatchewan is known as a hub for which sub-sector of biomanufacturing?",
      type: "multiple_choice",
      options: ["Cell and gene therapy", "Agricultural biotechnology", "Biofuels", "mRNA therapeutics"],
      correctAnswer: "Agricultural biotechnology",
      points: 1, order: 2,
      explanation: "Saskatoon is often called 'Canada's Silicon Valley of agricultural biotech,' home to VIDO, Ag-West Bio, and dozens of crop and animal health biotech companies.",
    },
    {
      text: "Which organization in Canada is responsible for regulating vaccines and cell/gene therapy products?",
      type: "multiple_choice",
      options: ["CFIA", "CADTH", "BGTD (Health Canada)", "PHAC"],
      correctAnswer: "BGTD (Health Canada)",
      points: 1, order: 3,
      explanation: "The Biologics and Genetic Therapies Directorate (BGTD) within Health Canada regulates vaccines, blood products, and cell/gene therapies.",
    },
    {
      text: "What does MSAT stand for in the context of biomanufacturing engineering?",
      type: "multiple_choice",
      options: ["Manufacturing Scale and Analytics Team", "Manufacturing Science and Technology", "Molecular Synthesis and Testing", "Material Sourcing and Analysis Team"],
      correctAnswer: "Manufacturing Science and Technology",
      points: 1, order: 4,
      explanation: "MSAT (Manufacturing Science and Technology) engineers bridge R&D and manufacturing, managing tech transfer, process characterization, and deviation investigations.",
    },
    {
      text: "Downstream bioprocessing includes operations such as protein A chromatography and UF/DF filtration.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswer: "True",
      points: 1, order: 5,
      explanation: "Downstream processing encompasses purification steps including chromatography (Protein A, ion exchange), viral filtration, and ultrafiltration/diafiltration (UF/DF).",
    },
    {
      text: "Which certification is issued by RAPS and is most relevant for professionals in regulatory affairs?",
      type: "multiple_choice",
      options: ["P.Eng.", "RAC", "CQA", "PMP"],
      correctAnswer: "RAC",
      points: 1, order: 6,
      explanation: "The RAC (Regulatory Affairs Certification) is issued by RAPS (Regulatory Affairs Professionals Society) and is a key credential for regulatory affairs professionals.",
    },
    {
      text: "Which of the following best describes what a Quality Assurance (QA) Specialist does?",
      type: "multiple_choice",
      options: [
        "Tests finished products using HPLC and ELISA methods",
        "Programs and maintains SCADA process control systems",
        "Develops and maintains the Quality Management System, manages deviations and CAPAs",
        "Manages supply chain logistics and raw material procurement",
      ],
      correctAnswer: "Develops and maintains the Quality Management System, manages deviations and CAPAs",
      points: 1, order: 7,
      explanation: "QA Specialists manage the QMS, review batch records, handle deviations and CAPAs, and conduct audits — while QC Analysts perform the actual laboratory testing.",
    },
    {
      text: "The city of Vancouver is home to AbCellera Biologics, known for antibody discovery and scale-up.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswer: "True",
      points: 1, order: 8,
      explanation: "AbCellera Biologics is headquartered in Vancouver and is known for its antibody discovery platform, which was used to identify bamlanivimab during COVID-19.",
    },
    {
      text: "What does GMP stand for, and why is it critical to manufacturing careers in biomanufacturing?",
      type: "multiple_choice",
      options: [
        "Good Molecular Practice — ensures accurate lab measurements",
        "General Manufacturing Protocols — standardizes production workflows",
        "Good Manufacturing Practice — the regulatory framework ensuring products are consistently produced to quality standards",
        "Government Manufacturing Policy — sets minimum wage standards in manufacturing",
      ],
      correctAnswer: "Good Manufacturing Practice — the regulatory framework ensuring products are consistently produced to quality standards",
      points: 1, order: 9,
      explanation: "GMP (Good Manufacturing Practice) is the regulatory framework governing how pharmaceutical and biologic products are manufactured, tested, and released to ensure safety, efficacy, and consistency.",
    },
    {
      text: "A typical entry-level biomanufacturing operator or research associate in Canada can expect a starting salary in the range of:",
      type: "multiple_choice",
      options: ["$25,000 – $35,000", "$45,000 – $65,000", "$90,000 – $110,000", "$150,000 – $180,000"],
      correctAnswer: "$45,000 – $65,000",
      points: 1, order: 10,
      explanation: "Entry-level roles (Research Associates, Manufacturing Operators, QC Analysts) in Canadian biomanufacturing typically range from $45,000 to $65,000 annually.",
    },
    {
      text: "Which sub-sector of biomanufacturing is described as the fastest-growing with the most acute talent shortages?",
      type: "multiple_choice",
      options: ["Industrial enzymes", "Agricultural biotech", "Cell and gene therapy manufacturing", "Biofuels"],
      correctAnswer: "Cell and gene therapy manufacturing",
      points: 1, order: 11,
      explanation: "Cell and gene therapy manufacturing is the fastest-growing sub-sector, with significant investment across Canada and globally, and a persistent shortage of trained manufacturing professionals.",
    },
    {
      text: "Contract Development & Manufacturing Organizations (CDMOs) are generally not recommended for early-career professionals due to their limited training opportunities.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswer: "False",
      points: 1, order: 12,
      explanation: "CDMOs are actually excellent for early-career professionals — they provide exposure to multiple client programs, diverse technologies, and comprehensive GMP training, accelerating career development.",
    },
    {
      text: "The SR&ED program in Canada refers to:",
      type: "multiple_choice",
      options: [
        "Standards for Regulatory Excellence and Development",
        "Scientific Research and Experimental Development — a federal tax incentive for R&D spending",
        "Sector Readiness and Engineering Development",
        "Supervised Research and Educational Development",
      ],
      correctAnswer: "Scientific Research and Experimental Development — a federal tax incentive for R&D spending",
      points: 1, order: 13,
      explanation: "SR&ED (Scientific Research and Experimental Development) is a federal tax incentive program that encourages Canadian companies to conduct R&D by providing tax credits on eligible expenditures.",
    },
    {
      text: "Which engineering credential is required in Canada for signing off on major engineering deliverables and design documents?",
      type: "multiple_choice",
      options: ["MBA", "P.Eng. (Professional Engineer)", "PhD in Engineering", "Six Sigma Black Belt"],
      correctAnswer: "P.Eng. (Professional Engineer)",
      points: 1, order: 14,
      explanation: "The P.Eng. (Professional Engineer) designation from Engineers Canada is required for stamping and signing engineering documents, designs, and reports in regulated industries.",
    },
    {
      text: "Canada's life sciences sector is projected to add over 20,000 net new jobs by 2030.",
      type: "true_false",
      options: ["True", "False"],
      correctAnswer: "True",
      points: 1, order: 15,
      explanation: "Canada's Biomanufacturing and Life Sciences Strategy identifies strong job growth of 20,000+ positions by 2030, driven by domestic manufacturing expansion, cell/gene therapy, and pandemic preparedness investments.",
    },
  ],
};

async function main() {
  console.log("Seeding biomanufacturing course…");

  // Find admin user
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("No admin user found. Register first at /register.");

  // Delete existing course with same title
  const existing = await prisma.course.findFirst({
    where: { title: "Career Options in Biomanufacturing in Canada" },
  });
  if (existing) {
    await prisma.course.delete({ where: { id: existing.id } });
    console.log("Deleted existing course.");
  }

  // Create course
  const course = await prisma.course.create({
    data: {
      title: "Career Options in Biomanufacturing in Canada",
      description:
        "Explore the rapidly growing field of biomanufacturing in Canada. This course covers the full landscape of career pathways — from R&D and manufacturing to quality, engineering, and business roles — with real salary data, key employers, education requirements, and actionable steps to launch your career.",
      category: "Life Sciences",
      tags: JSON.stringify(["biomanufacturing", "careers", "Canada", "biotech", "life sciences", "GMP"]),
      courseType: "content",
      status: "published",
      passingScore: 75,
      duration: 96,
      instructorId: admin.id,
    },
  });
  console.log(`Created course: ${course.id}`);

  // Create modules
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
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
    console.log(`  Module ${i + 1}: ${m.title}`);
  }

  // Create assessment
  const assessment = await prisma.assessment.create({
    data: {
      courseId: course.id,
      title: assessmentData.title,
      description: assessmentData.description,
      passingScore: assessmentData.passingScore,
      maxAttempts: 0,
      shuffleQ: true,
      questions: {
        create: assessmentData.questions.map((q) => ({
          text: q.text,
          type: q.type,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: q.order,
          explanation: q.explanation,
        })),
      },
    },
  });
  console.log(`  Assessment: ${assessment.id} (${assessmentData.questions.length} questions)`);

  console.log("\nDone! Course published at /courses/" + course.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
