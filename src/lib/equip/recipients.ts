/**
 * EQUIP funded-recipient roster — the single source of truth for both the
 * /admin/equip/tracker dossier and the public recipients feed. Extracted from
 * the old inline DATA object; edit HERE going forward (a rescan pastes the new
 * curated set into this array).
 *
 * `project` is the VentureLift project name (VC has none). Pre-filled from the
 * funding DB (EquipApplication.formData.projectTitle) where the company name
 * matched; fill any blanks by hand.
 */
export type EquipTrack = "VC" | "VL" | "Both";
export interface EquipRecipientLink { label: string; url: string }
export interface EquipRecipientPost { when: string; text: string; type: string; hl?: boolean; src?: string | null; url?: string | null }
export interface EquipRecipient {
  name: string;
  track: EquipTrack;
  rounds: string;
  founder: string;
  inst: string;
  linkedin: EquipRecipientLink | null;
  website: EquipRecipientLink | null;
  status: string;
  statusText: string;
  posts: EquipRecipientPost[];
  /** VentureLift project name (curated; VC recipients have none). */
  project?: string;
}

export const EQUIP_UPDATED = "2026-07-29";

export const EQUIP_RECIPIENTS: EquipRecipient[] = [
    {
      "name": "Rayyan Therapeutics",
      "track": "VC",
      "rounds": "VC R1",
      "founder": "Hasam Madarati",
      "inst": "McMaster University",
      "linkedin": {
        "label": "company/rayyantherapeutics",
        "url": "https://www.linkedin.com/company/rayyantherapeutics/"
      },
      "website": null,
      "status": "web",
      "statusText": "LinkedIn active — website offline (domain disconnected)",
      "posts": [
        {
          "when": "Nov 2025",
          "text": "Co-founder and CEO Hasam Madarati shared the audience-voted People’s Choice Award at McMaster’s Postdoc Entrepreneur Fellowship pitch event for the company’s extended-window stroke treatment.",
          "type": "Award",
          "hl": false,
          "src": "McMaster Research & Innovation",
          "url": "https://research.mcmaster.ca/postdoc-entrepreneur-nathan-mullins-awarded-75000-fellowship-to-advance-biotech-solution/"
        },
        {
          "when": "Mar 2025",
          "text": "Co-founders Hasam Madarati and Colin Kretz published the company’s protease-resistant ADAMTS13 variant in Blood Advances, with patent protection disclosed.",
          "type": "Milestone",
          "hl": false,
          "src": "Blood Advances",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12159909/"
        },
        {
          "when": "~7 mo ago",
          "text": "Announced joining the 2025–2026 ECHO commercialization cohort.",
          "type": "Milestone",
          "hl": true,
          "src": "LinkedIn post",
          "url": "https://www.linkedin.com/company/rayyantherapeutics/posts/"
        }
      ]
    },
    {
      "name": "Neuropeutics Inc.",
      "track": "Both",
      "rounds": "VC R1, R6 · VL R1",
      "founder": "Marc Shenouda",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/neuropeutics-inc",
        "url": "https://ca.linkedin.com/company/neuropeutics-inc"
      },
      "website": {
        "label": "neuropeutics.ca",
        "url": "https://neuropeutics.ca"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Jun 2026",
          "text": "Selected into the MassChallenge Switzerland & UK 2026 Healthtech cohort — 189 finalists from 1,961 applicants across 47 countries, competing for up to CHF 1M in equity-free prizes.",
          "type": "Recognition",
          "hl": true,
          "src": "MassChallenge",
          "url": "https://masschallenge.org/news/switzerland-uk-2026-cohort/"
        },
        {
          "when": "Jun 2026",
          "text": "Won second prize and the People’s Choice Investment Award at the IDEA Mississauga Step-Up Pitch & Showcase; CEO Marc Shenouda received the 2025 Temerty Innovation Prize for Student Entrepreneurship.",
          "type": "Award",
          "hl": false,
          "src": "Neuropeutics news",
          "url": "https://neuropeutics.ca/news.html"
        },
        {
          "when": "Mar 2026",
          "text": "Co-founder and CSO Janice Robertson awarded a $500,000 three-year ALS Canada–Brain Canada Development Grant to advance the importin-β1 modulator behind the JRMS compound.",
          "type": "Funding",
          "hl": true,
          "src": "ALS Society of Canada",
          "url": "https://als.ca/news/als-canada-and-brain-canada-award-1-5-million-to-six-research-teams-driving-discovery-in-als-research/"
        },
        {
          "when": "Mar 2026",
          "text": "Named among Ontario Genomics projects funded under the Regional Genomic Applications Partnership Program (GAPP), part of a $20M federal package across 34 commercialization initiatives.",
          "type": "Funding",
          "hl": true,
          "src": "OBIO",
          "url": "https://www.obio.ca/obio-backup/obio1/2026/03/ten-national-and-regional-ontario-genomics-projects-are-part-of-20-million-funding-package"
        },
        {
          "when": "Jan 2026",
          "text": "Peer-reviewed paper on JRMS, the lead small molecule, published in Neurotherapeutics.",
          "type": "Milestone",
          "hl": false,
          "src": "Neurotherapeutics",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12976485/"
        },
        {
          "when": "May 2025",
          "text": "Received the inaugural AbbVie Biotech Innovators Award — SpinUp lab space plus mentorship.",
          "type": "Award",
          "hl": true,
          "src": "UTM news",
          "url": "https://www.utm.utoronto.ca/main-news/brain-health-startup-join-spinup-first-abbvie-biotech-innovators-award-winner"
        },
        {
          "when": "2025",
          "text": "Partnered with UK charity LifeArc to develop an ALS / neurodegeneration drug (JRMS-22).",
          "type": "Partnership",
          "hl": true,
          "src": "Temerty Medicine",
          "url": "https://temertymedicine.utoronto.ca/news/u-t-alums-start-neuropeutics-gets-boost-uk-based-charity"
        }
      ]
    },
    {
      "name": "HDAX Therapeutics",
      "track": "VC",
      "rounds": "VC R1",
      "founder": "Nabanita Nawar",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/hdaxtx",
        "url": "https://www.linkedin.com/company/hdaxtx"
      },
      "website": {
        "label": "hdaxtx.com",
        "url": "https://hdaxtx.com"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Jun 2026",
          "text": "CEO Nabanita Nawar took investor meetings at BIO International 2026 in San Diego; the team also attended PKDCON 2026 in Chicago on its oral HDAC6 inhibitor for ADPKD.",
          "type": "Milestone",
          "hl": false,
          "src": "LinkedIn",
          "url": "https://www.linkedin.com/company/hdaxtx"
        },
        {
          "when": "Jan 2026",
          "text": "Presented as an Ontario delegate at Biotech Showcase 2026 in San Francisco, confirming ADPKD as lead indication with development-candidate nomination as the current goal.",
          "type": "Milestone",
          "hl": false,
          "src": "Source from Ontario",
          "url": "https://www.sourcefromontario.com/en/page/delegate/138313/hdax-therapeutics"
        },
        {
          "when": "Sep 2024",
          "text": "Closed an oversubscribed ~CA$4.3M seed round (SeedFolio, FACIT, TIAP).",
          "type": "Funding",
          "hl": true,
          "src": "H2i / U of T",
          "url": "https://h2i.utoronto.ca/2024/09/20/hdax-therapeutics-closes-4-3-million-seed-round/"
        },
        {
          "when": "2023",
          "text": "Co-founders Nabanita Nawar & Pimyupa Manaswiyoungkul named to Forbes 30 Under 30 (Toronto).",
          "type": "Recognition",
          "hl": true,
          "src": "Endless Frontier Labs",
          "url": "https://endlessfrontierlabs.com/hdax-therapeutics-co-founders-nabanita-nawar-and-pimyupa-manaswiyoungkul-have-been-featured-on-forbes-30-under-30-local-toronto/"
        },
        {
          "when": "~2 mo ago",
          "text": "Fraud alert regarding fraudulent job offers using HDAX's name.",
          "type": "Notice",
          "hl": false,
          "src": "LinkedIn",
          "url": "https://www.linkedin.com/company/hdaxtx/posts/"
        }
      ]
    },
    {
      "name": "Fibra Inc.",
      "track": "VC",
      "rounds": "VC R1",
      "founder": "Milad Ghalamboran · fdr. Parnian Majd",
      "inst": "University of Toronto / TMU",
      "linkedin": {
        "label": "company/myfibra",
        "url": "https://www.linkedin.com/company/myfibra/"
      },
      "website": {
        "label": "myfibra.com",
        "url": "https://myfibra.com"
      },
      "status": "live",
      "statusText": "LinkedIn + website active (moved to myfibra.com)",
      "posts": [
        {
          "when": "May 2026",
          "text": "Named to NACO’s Canada’s Top Moonshot Ventures 2026 (healthtech/biotech), with CEO Parnian Majd pitching at the closed-door showcase at NACO Summit 2026 in Ottawa.",
          "type": "Recognition",
          "hl": true,
          "src": "NACO",
          "url": "https://finance.yahoo.com/sectors/technology/articles/canadas-top-moonshot-ventures-2026-140100668.html"
        },
        {
          "when": "Apr 2026",
          "text": "Founder and CEO Parnian Majd named to the Canadian Life Sciences Top 20 Under 40.",
          "type": "Award",
          "hl": true,
          "src": "Top 20 Under 40 Life Sciences",
          "url": "https://www.top20under40lifesciences.com/2025winners/"
        },
        {
          "when": "Aug 2024",
          "text": "Closed an oversubscribed US$1.25M (≈CA$1.7M) pre-seed round for its smart-underwear women's-health platform.",
          "type": "Funding",
          "hl": true,
          "src": "Femtech Insider",
          "url": "https://femtechinsider.com/fibra-pre-seed/"
        },
        {
          "when": "~2 wk ago",
          "text": "Featured in Emmeline Ventures' “10 Companies in Fertility to Watch.”",
          "type": "Recognition",
          "hl": true,
          "src": "LinkedIn post",
          "url": "https://www.linkedin.com/company/myfibra/posts/"
        }
      ]
    },
    {
      "name": "Re:pair Genomics",
      "track": "VC",
      "rounds": "VC R2",
      "founder": "Luca Hategan · Yosuke Niibori",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/repair-genomics",
        "url": "https://www.linkedin.com/company/repair-genomics"
      },
      "website": {
        "label": "repairgenomics.com",
        "url": "https://repairgenomics.com"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Apr 2026",
          "text": "Named runner-up at the FemSTEM Pitch Competition.",
          "type": "Award",
          "hl": false,
          "src": "LinkedIn",
          "url": "https://ca.linkedin.com/company/re-pair-genomics"
        },
        {
          "when": "Mar 2026",
          "text": "Placed top 4 in the Digital Health Tech stream at the Elevator Pitch International Competition (EPIC), and joined the Canada–Korea AI x Life Sciences forum via the CLIP-PDA mission.",
          "type": "Award",
          "hl": false,
          "src": "Re:pair news",
          "url": "https://repairgenomics.com/news/"
        },
        {
          "when": "Jan 2026",
          "text": "Filed a US provisional patent covering 30+ CNS-related promoters; co-founder Luca Hategan named one of 12 national finalists in Enactus Canada’s 2026 Student Entrepreneur competition.",
          "type": "Milestone",
          "hl": true,
          "src": "Re:pair news",
          "url": "https://repairgenomics.com/news/"
        },
        {
          "when": "Nov 2025",
          "text": "Awarded a $105,000 Mitacs grant to design cross-species-reactive compact promoters for cell-type-specific targeting.",
          "type": "Funding",
          "hl": true,
          "src": "Re:pair news",
          "url": "https://repairgenomics.com/news/"
        }
      ]
    },
    {
      "name": "MVT in Silico Corp.",
      "track": "VC",
      "rounds": "VC R2, R5",
      "founder": "Yihang Cheng",
      "inst": "Western University",
      "linkedin": {
        "label": "company/mvt-in-silico-corp",
        "url": "https://ca.linkedin.com/company/mvt-in-silico-corp"
      },
      "website": {
        "label": "mvtinsilico.ca",
        "url": "https://mvtinsilico.ca"
      },
      "status": "live",
      "statusText": "LinkedIn + website active · mostly reposts",
      "posts": [
        {
          "when": "Apr 2026",
          "text": "Exhibited its MVT Physiology Engine at the Ontario Centre of Innovation’s DiscoveryX 2026 conference in Toronto.",
          "type": "Milestone",
          "hl": false,
          "src": "Company news",
          "url": "https://www.mvtinsilico.ca/news.html"
        },
        {
          "when": "Feb 2026",
          "text": "Announced a dermal drug-administration digital twin for assessing delivery through skin, following a January cardiotoxicity assay release.",
          "type": "Product",
          "hl": false,
          "src": "Company news",
          "url": "https://www.mvtinsilico.ca/news.html"
        },
        {
          "when": "~6 days ago",
          "text": "Repost: Insilico Medicine conference panel (industry repost, not original news).",
          "type": "Repost",
          "hl": false,
          "src": "LinkedIn",
          "url": "https://www.linkedin.com/company/mvt-in-silico-corp/posts/"
        }
      ]
    },
    {
      "name": "HormonaLab",
      "track": "VC",
      "rounds": "VC R3",
      "founder": "Nancy Tahmo",
      "inst": "University of Toronto",
      "linkedin": null,
      "website": {
        "label": "hormonalab.com",
        "url": "https://hormonalab.com"
      },
      "status": "web",
      "statusText": "Website only — no LinkedIn page found",
      "posts": [
        {
          "when": "2025",
          "text": "Menopause care via predictive modelling + wearables; EQUIP recipient. No LinkedIn company page found.",
          "type": "Web only",
          "hl": false,
          "src": "hormonalab.com",
          "url": "https://hormonalab.com"
        }
      ]
    },
    {
      "name": "NephroTech",
      "track": "VC",
      "rounds": "VC R3",
      "founder": "Ria Khan",
      "inst": "University of Toronto",
      "linkedin": null,
      "website": null,
      "status": "none",
      "statusText": "No company page / website — founder profile only",
      "posts": [
        {
          "when": "Jan 2026",
          "text": "Co-founder Ria Khan named one of twelve national finalists in Enactus Canada’s 2026 Student Entrepreneur National Competition.",
          "type": "Recognition",
          "hl": false,
          "src": "Enactus Canada",
          "url": "https://enactus.ca/student-entrepreneur/meet-12-of-canadas-top-post-secondary-entrepreneurs/"
        },
        {
          "when": "Dec 2025",
          "text": "Profiled by U of T’s Centre for Entrepreneurship as one of 22 teams worldwide reaching the Hult Prize Global Finals, targeting a Canadian pilot by 2028.",
          "type": "Recognition",
          "hl": false,
          "src": "UofT Centre for Entrepreneurship",
          "url": "https://www.entrepreneurship.artsci.utoronto.ca/news/hult-prize-u-t-top-22-finalists-nephrotech-share-their-global-ambitions"
        },
        {
          "when": "Nov 2025",
          "text": "One of three ventures awarded a $5,000 Student Innovation Fellowship at U of T Health Innovation Hub (H2i) Pitch Perfect 2025.",
          "type": "Funding",
          "hl": false,
          "src": "H2i",
          "url": "https://h2i.utoronto.ca/2025/11/13/announcing-the-winners-of-pitch-perfect-2025/"
        }
      ]
    },
    {
      "name": "NewGen Health",
      "track": "Both",
      "rounds": "VC R5, R12 · VL R4",
      "founder": "Mazhar Shahen",
      "inst": "University of Waterloo",
      "linkedin": {
        "label": "company/newgen-health",
        "url": "https://www.linkedin.com/company/newgen-health/"
      },
      "website": {
        "label": "newgenhealth.io",
        "url": "https://newgenhealth.io"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Mar 2026",
          "text": "Won the $30,000 grand prize at SE Health’s Chrysalis Innovation Challenge for its at-home testing and digital monitoring approach to early chronic-disease detection.",
          "type": "Award",
          "hl": true,
          "src": "SE Health",
          "url": "https://sehc.com/news/newgen-health-wins-grand-prize-se-healths-chrysalis-innovation-challenge"
        },
        {
          "when": "~2 mo ago",
          "text": "Founder Mazhar Shahen featured speaker at MaRS Impact Health 2026.",
          "type": "Recognition",
          "hl": true,
          "src": "LinkedIn post",
          "url": "https://www.linkedin.com/company/newgen-health/posts/"
        }
      ]
    },
    {
      "name": "CELLECT Laboratories Inc.",
      "track": "Both",
      "rounds": "VC R7, R10 · VL R3",
      "founder": "CT Murphy",
      "inst": "University of Waterloo",
      "linkedin": {
        "label": "company/cellectlaboratories",
        "url": "https://www.linkedin.com/company/cellectlaboratories/"
      },
      "website": {
        "label": "cellectlaboratories.com",
        "url": "https://cellectlaboratories.com"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Dec 2025",
          "text": "Co-founder Ibukun Elebute told Broadview Magazine the company has secured partnerships to prove its prototype ahead of cervical-cancer applications.",
          "type": "Milestone",
          "hl": false,
          "src": "Broadview Magazine",
          "url": "https://broadview.org/ibukun-elebute-cancer-screening/"
        },
        {
          "when": "Sep 2025",
          "text": "BioWorld reported CELLECT filed its first patent for its menstrual-product-based cervical cell collection method.",
          "type": "Milestone",
          "hl": true,
          "src": "BioWorld",
          "url": "https://www.bioworld.com/articles/724230-cellect-develops-menstrual-products-for-cervical-cancer-screening?v=p"
        },
        {
          "when": "2025",
          "text": "CBC-covered “game-changer” for women's health — won pitch funding for nanotech HPV / cervical-cancer screening built into menstrual products.",
          "type": "Recognition",
          "hl": true,
          "src": "CBC News",
          "url": "https://www.cbc.ca/news/canada/kitchener-waterloo/waterloo-startup-wins-money-for-invention-that-is-a-game-changer-for-women-s-health-1.7528762"
        },
        {
          "when": "recent",
          "text": "Repost: upcoming CELLECT newsletter (“progress, milestones, mission”).",
          "type": "Update",
          "hl": false,
          "src": "LinkedIn",
          "url": "https://www.linkedin.com/company/cellectlaboratories/posts/"
        }
      ]
    },
    {
      "name": "Laetech",
      "track": "VC",
      "rounds": "VC R11",
      "founder": "Brian Webb · Kate MacQuarrie",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/laetech",
        "url": "https://ca.linkedin.com/company/laetech"
      },
      "website": {
        "label": "laetechcorp.com",
        "url": "https://laetechcorp.com"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "May 2026",
          "text": "Secured Mitacs funding to continue development and translation of its soft-tissue regeneration technology (amount undisclosed).",
          "type": "Funding",
          "hl": true,
          "src": "Santerre Lab, U of T",
          "url": "https://www.santerrelab.com/news/2026/5/8/laetech-rbpc"
        },
        {
          "when": "May 2026",
          "text": "Reached semi-finalist status as one of 42 startups at the 2026 Rice Business Plan Competition in Houston, with Brian Webb pitching.",
          "type": "Award",
          "hl": true,
          "src": "Rice Business Plan Competition",
          "url": "https://rbpc.rice.edu/2026/2026-startups"
        },
        {
          "when": "~7 mo ago",
          "text": "Presentation at TERMIS (Tissue Engineering & Regenerative Medicine International Society).",
          "type": "Conference",
          "hl": false,
          "src": "LinkedIn",
          "url": "https://www.linkedin.com/company/laetech/posts/"
        }
      ]
    },
    {
      "name": "Heprion Inc.",
      "track": "VC",
      "rounds": "VC R11, R12",
      "founder": "Hamza Arshad · Wenda Zhao",
      "inst": "University of Toronto",
      "linkedin": null,
      "website": {
        "label": "heprion.com",
        "url": "https://heprion.com"
      },
      "status": "web",
      "statusText": "Website only — no LinkedIn page found",
      "posts": [
        {
          "when": "Dec 2025",
          "text": "A U of T Tanz Centre profile confirmed Heprion spun out of Gerold Schmitt-Ulms’ lab with Hamza Arshad as CSO, in early-stage commercialization through U of T incubators while seeking funding.",
          "type": "Milestone",
          "hl": false,
          "src": "U of T Tanz Centre",
          "url": "https://tanz.med.utoronto.ca/news/tanz-centre-alum-finds-career-commercialization"
        },
        {
          "when": "n/a",
          "text": "U of T prion-disease biotech, early stage. No LinkedIn company page found.",
          "type": "Web only",
          "hl": false,
          "src": "heprion.com",
          "url": "https://heprion.com"
        }
      ]
    },
    {
      "name": "BioPSci Therapeutics",
      "track": "VC",
      "rounds": "VC R13",
      "founder": "Khalsa S.",
      "inst": "University of Toronto",
      "linkedin": null,
      "website": null,
      "status": "none",
      "statusText": "Nothing found",
      "posts": [
        {
          "when": "n/a",
          "text": "No LinkedIn page or website located — nothing to report.",
          "type": "None found",
          "hl": false,
          "src": "—",
          "url": null
        }
      ]
    },
    {
      "name": "Belaris Biotech",
      "track": "VC",
      "rounds": "VC R13",
      "founder": "Meghan Brar",
      "inst": "University of Waterloo",
      "linkedin": {
        "label": "company/belaris-biotech",
        "url": "https://ca.linkedin.com/company/belaris-biotech"
      },
      "website": {
        "label": "vetvivo.com",
        "url": "https://vetvivo.com"
      },
      "status": "live",
      "statusText": "LinkedIn active — website minimal",
      "posts": [
        {
          "when": "Jun 2026",
          "text": "Selected for the Innovation Boost Zone Innovation Fellowship (Stream 3, Product Development) from 136 Ontario applicants, receiving $10,000 for a four-month R&D push.",
          "type": "Funding",
          "hl": true,
          "src": "Innovation Boost Zone",
          "url": "https://ca.linkedin.com/company/innovationboostzone"
        },
        {
          "when": "Jun 2026",
          "text": "Presented clinical study results at the ACVIM Forum in Seattle, and pitched at Venture Summit West in Silicon Valley.",
          "type": "Clinical",
          "hl": false,
          "src": "LinkedIn",
          "url": "https://ca.linkedin.com/company/belaris-biotech"
        },
        {
          "when": "Apr 2026",
          "text": "A custom Belaris stent was placed in a canine patient in live surgery, restoring nasal breathing; the team was also a national finalist in The Arena 2026.",
          "type": "Clinical",
          "hl": true,
          "src": "LinkedIn / SMU News",
          "url": "https://news.smu.ca/news/2026/4/1/final-round-of-the-arena-2026-features-top-student-innovators-from-across-canada"
        }
      ]
    },
    {
      "name": "ThermOcular AI",
      "track": "VL",
      "rounds": "VL R1",
      "founder": "Ehsan Zare Bidaki",
      "inst": "University of Waterloo",
      "linkedin": null,
      "website": {
        "label": "thermocularai.ca",
        "url": "https://thermocularai.ca"
      },
      "status": "web",
      "statusText": "Website only — founder posts on personal profile",
      "posts": [
        {
          "when": "May 2026",
          "text": "Reports 78 patients tested in a controlled clinical environment and 8 letters of intent signed with clinics, with broader rollout pending regulatory clearance.",
          "type": "Milestone",
          "hl": true,
          "src": "Company website",
          "url": "https://www.thermocularai.ca/"
        },
        {
          "when": "Apr 2026",
          "text": "Submitted its clinical validation study to Contact Lens & Anterior Eye (under peer review); presented at NCC 2026 in the BCLA scientific stream.",
          "type": "Clinical",
          "hl": false,
          "src": "Company website",
          "url": "https://www.thermocularai.ca/company"
        },
        {
          "when": "2024–2025",
          "text": "Patented thermal-imaging dry-eye screening; Velocity Up Start. Updates on founder's profile; no company LinkedIn page.",
          "type": "Web / founder",
          "hl": true,
          "src": "thermocularai.ca",
          "url": "https://thermocularai.ca"
        }
      ]
    },
    {
      "name": "Synakis",
      "track": "VL",
      "rounds": "VL R1",
      "founder": "Jonathan Labriola",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/synakis",
        "url": "https://ca.linkedin.com/company/synakis"
      },
      "website": {
        "label": "synakis.ca",
        "url": "https://www.synakis.ca"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Jun 2026",
          "text": "Won both the Judge’s Choice and People’s Choice Awards in the Capital & Growth category at the 2026 Ophthalmology Tech Forum in Newport Beach.",
          "type": "Award",
          "hl": true,
          "src": "Synakis news",
          "url": "https://www.synakis.ca/news-otf"
        },
        {
          "when": "May 2026",
          "text": "Closed an oversubscribed CAD $2.6M pre-seed round co-led by Toronto Innovation Acceleration Partners (TIAP) and Chiefswood Private Capital, with the Ontario Centre of Innovation and GlycoNet participating — funding GLP toxicology and a Health Canada Investigational Testing Authorization filing for SNK-125.",
          "type": "Funding",
          "hl": true,
          "src": "Cision Newswire",
          "url": "https://www.newswire.ca/news-releases/synakis-announces-close-of-oversubscribed-pre-seed-round-826502148.html"
        },
        {
          "when": "Mar 2026",
          "text": "Admitted to Ontario Genomics’ BioCreate program, securing $150,000 in seed funding plus 18 months of mentorship and infrastructure.",
          "type": "Funding",
          "hl": true,
          "src": "Synakis news",
          "url": "https://www.synakis.ca/news-biocreate"
        },
        {
          "when": "Dec 2025",
          "text": "Co-founder and CSO Molly Shoichet received the Terrence Donnelly Innovation Award ($250,000) to advance the ocular hydrogel technology behind Synakis.",
          "type": "Award",
          "hl": true,
          "src": "Synakis news",
          "url": "https://www.synakis.ca/news-donnelly"
        },
        {
          "when": "2024",
          "text": "Won 1st place at the Desjardins Pitch Competition (Donnelly Centre startup).",
          "type": "Award",
          "hl": true,
          "src": "Donnelly Centre",
          "url": "https://thedonnellycentre.utoronto.ca/news/donnelly-centre-startup-wins-first-place-desjardins-pitch-competition"
        }
      ]
    },
    {
      "name": "Vrit Inc.",
      "track": "Both",
      "rounds": "VC R14 · VL R2",
      "founder": "Sushant Singh",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/vrit-inc",
        "url": "https://ca.linkedin.com/company/vrit-inc"
      },
      "website": null,
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Jul 2026",
          "text": "U of T Engineering reported VRiT is preparing to launch a $3M pre-seed financing round, using Desjardins prize money to develop its regulatory strategy.",
          "type": "Milestone",
          "hl": true,
          "src": "U of T Engineering",
          "url": "https://news.engineering.utoronto.ca/the-future-of-wound-healing-desjardins-prize-supports-u-of-t-bioprinting-startup/"
        },
        {
          "when": "May 2026",
          "text": "Named to the BetaKit Most Ambitious 2026 list under the “Defend the Dominion” theme for its hand-held bioprinter.",
          "type": "Recognition",
          "hl": false,
          "src": "BetaKit",
          "url": "https://mostambitious.betakit.com/2026/vrit/"
        },
        {
          "when": "Mar 2026",
          "text": "Founder and CEO Sushant Singh won the $40,000 top overall prize at U of T’s 2026 Desjardins Startup Prize; a paper on in-situ printing of biphasic jammed inks (with microgravity validation) was published in Biofabrication.",
          "type": "Award",
          "hl": true,
          "src": "U of T Engineering",
          "url": "https://news.engineering.utoronto.ca/the-future-of-wound-healing-desjardins-prize-supports-u-of-t-bioprinting-startup/"
        }
      ]
    },
    {
      "name": "Fertilead Inc.",
      "track": "VL",
      "rounds": "VL R2",
      "founder": "Narjes Allahrabbi",
      "inst": "Toronto Metropolitan University",
      "linkedin": {
        "label": "company/fertileadinc",
        "url": "https://ca.linkedin.com/company/fertileadinc"
      },
      "website": null,
      "status": "live",
      "statusText": "LinkedIn active",
      "posts": [
        {
          "when": "Feb 2026",
          "text": "TMU reported Fertilead’s 2026 goal is Research Ethics Board approval and a first Canadian clinical validation study with 30 patients.",
          "type": "Clinical",
          "hl": false,
          "src": "Toronto Metropolitan University",
          "url": "https://www.torontomu.ca/engineering-architectural-science/stories-events/stories/2026/02/dr-narjes-allahrabbi/"
        },
        {
          "when": "Nov 2025",
          "text": "Founder and CEO Narjes Allahrabbi received the 2025 Mitacs Innovation Award for Canadian Start-Up Innovator of the Year in Ottawa.",
          "type": "Award",
          "hl": true,
          "src": "GTA Weekly",
          "url": "https://www.gtaweekly.ca/mitacs-innovation-award-toronto-scientist/"
        },
        {
          "when": "~5 mo ago",
          "text": "Named a 2026 Synapse Life Science Pitch Competition Finalist (Innovation Factory).",
          "type": "Recognition",
          "hl": true,
          "src": "LinkedIn post",
          "url": "https://www.linkedin.com/company/fertileadinc/posts/"
        },
        {
          "when": "~10 mo ago",
          "text": "Announced being awarded the EQUIP VentureLift Grant.",
          "type": "Award",
          "hl": true,
          "src": "LinkedIn post",
          "url": "https://www.linkedin.com/company/fertileadinc/posts/"
        }
      ]
    },
    {
      "name": "Sparked Inc.",
      "track": "Both",
      "rounds": "VC R15 · VL R2",
      "founder": "Stephanie Buryk-Iggers",
      "inst": "University of Toronto / UHN",
      "linkedin": {
        "label": "company/sparkedscreening",
        "url": "https://ca.linkedin.com/company/sparkedscreening"
      },
      "website": {
        "label": "sparkedscreening.com",
        "url": "https://sparkedscreening.com"
      },
      "status": "web",
      "statusText": "LinkedIn page exists but no posts published",
      "posts": [
        {
          "when": "Jun 2026",
          "text": "Awarded an EQUIP VentureConnect grant (Round 15), adding a second EQUIP award alongside its VentureLift Round 2 grant.",
          "type": "Milestone",
          "hl": true,
          "src": "EQUIP Notice of Award",
          "url": null
        },
        {
          "when": "Dec 2025",
          "text": "Selected into UTM’s SpinUp wet-lab incubator for its at-home saliva-based cardiovascular screening device; founder Stephanie Buryk-Iggers completed her PhD and is now a postdoctoral researcher at Toronto General Hospital.",
          "type": "Milestone",
          "hl": true,
          "src": "U of T KPE / SpinUp",
          "url": "https://kpe.utoronto.ca/student-profile/rugby-rehabilitation-stephanie-buryk-iggers-lights-spark"
        },
        {
          "when": "2022",
          "text": "First at-home saliva CVD-risk screening; won the grand prize at H2i's FemSTEM pitch and reached four pitch finals.",
          "type": "Milestone",
          "hl": true,
          "src": "U of T news",
          "url": "https://www.utoronto.ca/news/having-lost-her-dad-stroke-phd-student-launches-cardiovascular-screening-startup"
        }
      ]
    },
    {
      "name": "Oculum",
      "track": "VL",
      "rounds": "VL R2",
      "founder": "Olga Klushina",
      "inst": "University of Toronto / York",
      "linkedin": {
        "label": "company/oculummedical",
        "url": "https://ca.linkedin.com/company/oculummedical"
      },
      "website": null,
      "status": "web",
      "statusText": "LinkedIn active — no public website",
      "posts": [
        {
          "when": "Apr 2026",
          "text": "Founder Olga Klushina selected as an Innovation Fellow in Sunnybrook’s Medventions program; Oculum is developing a surgical guidance tool for ophthalmic surgery with Sunnybrook Hospital.",
          "type": "Partnership",
          "hl": true,
          "src": "York University Alumni",
          "url": "https://www.yorku.ca/alumniandfriends/2026/04/olga-klushina-beng-21/"
        }
      ]
    },
    {
      "name": "Mandel Diagnostics",
      "track": "VL",
      "rounds": "VL R3",
      "founder": "Connor Kapahi",
      "inst": "Kitchener / Velocity",
      "linkedin": null,
      "website": null,
      "status": "live",
      "statusText": "Website active — POLI AMD screening device",
      "posts": [
        {
          "when": "May 2026",
          "text": "Connor Kapahi named top Student Entrepreneur at the 2026 Enactus Canada Student Entrepreneur National Competition, earning $10,000 for Mandel Diagnostics.",
          "type": "Award",
          "hl": true,
          "src": "Enactus Canada",
          "url": "https://enactus.ca/media-releases/connor-kapahi-wins-2026-student-entrepreneur-national-competition-for-mandel-diagnostics/"
        },
        {
          "when": "Feb 2026",
          "text": "Won the T-CAIREM Shark Tank Pitch Competition at the University of Toronto, taking a $25,000 prize for its AMD screening device.",
          "type": "Award",
          "hl": true,
          "src": "T-CAIREM, U of T",
          "url": "https://tcairem.utoronto.ca/news/meet-winner-t-cairem-shark-tank-pitch-competition-connor-kapahi"
        },
        {
          "when": "Nov 2025",
          "text": "One of five Waterloo startups awarded a $10,000 Velocity Momentum Grant to bring its MVP to market.",
          "type": "Funding",
          "hl": false,
          "src": "Velocity, U Waterloo",
          "url": "https://www.velocityincubator.com/news/velocity-is-building-momentum-for-waterloo-startups"
        }
      ]
    },
    {
      "name": "Zearup Biomed Inc.",
      "track": "VL",
      "rounds": "VL R4",
      "founder": "Jackie Liu",
      "inst": "University of Toronto",
      "linkedin": null,
      "website": null,
      "status": "none",
      "statusText": "No company page / website — founder profile only",
      "posts": [
        {
          "when": "Jul 2025",
          "text": "Co-founder Jackie Fule Liu profiled as a U of T Pharmacy “Grad to Watch”; Zearup reached the final pitch stage of PRiME’s Building a Biotech Venture and joined the MaRS x JLABS Rapid Fire Showcase.",
          "type": "Recognition",
          "hl": false,
          "src": "U of T Leslie Dan Faculty of Pharmacy",
          "url": "https://www.pharmacy.utoronto.ca/news-announcements/grad-watch-jackie-fule-lius-research-focuses-better-outcomes-patients"
        }
      ]
    },
    {
      "name": "ChASE Biotherapeutics",
      "track": "VL",
      "rounds": "VL R4",
      "founder": "Quinton Sirianni",
      "inst": "University",
      "linkedin": null,
      "website": null,
      "status": "none",
      "statusText": "Nothing found",
      "posts": [
        {
          "when": "Jul 2025",
          "text": "Co-founder Molly Shoichet received a $948,600 CIHR Project Grant to advance the ChASE37-AR platform for spinal cord and brain injury, funding preclinical studies and spin-off business development.",
          "type": "Funding",
          "hl": true,
          "src": "U of T Institute of Biomedical Engineering",
          "url": "https://bme.utoronto.ca/news/four-bme-core-faculty-members-receive-cihr-project-grant-funding/"
        }
      ]
    },
    {
      "name": "Farname-Diagnosis",
      "track": "VL",
      "rounds": "VL R4",
      "founder": "Soha Ahmadi",
      "inst": "University of Toronto",
      "linkedin": null,
      "website": null,
      "status": "none",
      "statusText": "No company page / website — founder profile only",
      "posts": [
        {
          "when": "Mar 2026",
          "text": "Placed third in the Early-Stage category of the 2026 Desjardins Startup Prize Pitch Competition at the University of Toronto.",
          "type": "Award",
          "hl": true,
          "src": "U of T Entrepreneurship",
          "url": "https://entrepreneurs.utoronto.ca/meet-the-winners-2026-desjardins-startup-prize-pitch/"
        },
        {
          "when": "2025",
          "text": "Founder Soha Ahmadi won the SICIEEIL pitch competition.",
          "type": "Award",
          "hl": true,
          "src": "U of T Chemistry",
          "url": "https://www.chemistry.utoronto.ca/news/synergy-science-dr-soha-ahmadi"
        }
      ]
    },
    {
      "name": "AlloWide Health Inc",
      "track": "VC",
      "rounds": "VC R14",
      "founder": "Poorya Saeedloo",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/allowide-health-inc",
        "url": "https://www.linkedin.com/company/allowide-health-inc/"
      },
      "website": {
        "label": "allowidehealth.com",
        "url": "https://allowidehealth.com"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "May 2026",
          "text": "Awarded an EQUIP VentureConnect grant (Round 14). Developing a patent-protected rehydration buffer for freeze-dried bone allografts; in pre-clinical validation with one provisional patent and one PCT application filed.",
          "type": "Milestone",
          "hl": true,
          "src": "EQUIP Notice of Award",
          "url": null
        }
      ]
    },
    {
      "name": "Alpha Biosensing",
      "track": "VL",
      "rounds": "VL R5",
      "founder": "Nicholas Kotoulas",
      "inst": "University of Toronto",
      "linkedin": null,
      "website": {
        "label": "alphabiosensing.com",
        "url": "https://www.alphabiosensing.com"
      },
      "status": "web",
      "statusText": "Website active — no LinkedIn company page found",
      "posts": [
        {
          "when": "Jul 2026",
          "text": "Awarded an EQUIP VentureLift grant (Round 5). Co-founded by CEO Nicholas Kotoulas and CSO Prof. M. Cynthia Goh (U of T Chemistry), building low-cost rapid bacterial biosensors: a “Surface Interaction Profile” that fingerprints the whole bacterial surface to identify pathogens, and a diffraction-based optical sensor that detects bacterial growth in under 20 minutes for rapid antibiotic-susceptibility testing.",
          "type": "Milestone",
          "hl": true,
          "src": "EQUIP Notice of Award",
          "url": null
        },
        {
          "when": "Jun 2025",
          "text": "Published the core pathogen-ID method in PLOS ONE — “Differentiating bacteria by their unique surface interactions” — with the Surface Interaction Profile distinguishing 12 test bacteria including MRSA, K. pneumoniae, A. baumannii and P. aeruginosa from a 10-minute interaction.",
          "type": "Milestone",
          "hl": true,
          "src": "PLOS ONE",
          "url": "https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0327489"
        },
        {
          "when": "Jul 2024",
          "text": "U of T Chemistry reported the Goh Lab launching BactiTrack, a low-cost diffraction-based device for detecting bacterial growth and antibiotic susceptibility built from a Raspberry Pi, Pi Camera and 3D-printed parts; a prototype was sent to Philippine General Hospital for testing.",
          "type": "Product",
          "hl": false,
          "src": "U of T Department of Chemistry",
          "url": "https://www.chemistry.utoronto.ca/news/goh-lab-launches-bactitrack-project"
        },
        {
          "when": "2024",
          "text": "Published the antibiotic-susceptibility technology in Analytical Methods — “Low-cost, real-time detection of bacterial growth via diffraction-based sensing.”",
          "type": "Milestone",
          "hl": false,
          "src": "Analytical Methods (RSC)",
          "url": "https://doi.org/10.1039/D4AY01489H"
        }
      ]
    },
    {
      "name": "NorthMiRs Inc.",
      "track": "VL",
      "rounds": "VL R5",
      "founder": "Samantha McWhirter",
      "inst": "University of Toronto",
      "linkedin": {
        "label": "company/northmirs",
        "url": "https://ca.linkedin.com/company/northmirs"
      },
      "website": {
        "label": "northmirs.com",
        "url": "https://www.northmirs.com"
      },
      "status": "live",
      "statusText": "LinkedIn + website active",
      "posts": [
        {
          "when": "Jul 2026",
          "text": "Awarded an EQUIP VentureLift grant (Round 5). Developing synthetic microRNA therapeutics delivered by lipid nanoparticles for sepsis-induced organ failure; lead candidate NM-001 targets sepsis-induced cardiac dysfunction. Spun out of the Walker Lab (U of T Chemistry) and the dos Santos lab (Temerty Medicine / St. Michael’s Hospital).",
          "type": "Milestone",
          "hl": true,
          "src": "EQUIP Notice of Award",
          "url": null
        },
        {
          "when": "Jul 2026",
          "text": "Still listed by adMare BioInnovations as an Active Venture in its Therapeutics Accelerator — “an early-stage biotech company with expertise in formulation and preclinical research with a mission to develop therapies for sepsis.”",
          "type": "Milestone",
          "hl": false,
          "src": "adMare BioInnovations",
          "url": "https://www.admarebio.com/en/accelerator/northmirs-1"
        },
        {
          "when": "Sep 2025",
          "text": "Co-founder and CEO Samantha McWhirter completed her PhD at the University of Toronto (Walker Lab), on formulating lipid nanoparticles to deliver microRNAs against dysregulated immune responses.",
          "type": "Milestone",
          "hl": false,
          "src": "The Walker Lab, U of T",
          "url": "https://www.thewalkerlab.com/2025/09/26/congratulations-to-dr-samantha-mcwhirter/"
        },
        {
          "when": "Apr 2025",
          "text": "MaRS Discovery District profiled the company’s academia-to-startup jump: incorporated in 2022, into the MaRS/adMare Therapeutics Accelerator in 2023, running preclinical work while pursuing pre-seed funding.",
          "type": "Recognition",
          "hl": false,
          "src": "MaRS Discovery District",
          "url": "https://www.marsdd.com/research-and-insights/how-northmirs-made-the-jump-from-academia-to-entrepreneurship/"
        },
        {
          "when": "Oct 2024",
          "text": "Won $250,000 at the ECHO PITCH competition run by the Ted Rogers Centre for Heart Research to develop a heart-failure treatment for sepsis patients.",
          "type": "Funding",
          "hl": true,
          "src": "U of T Faculty of Arts & Science",
          "url": "https://www.artsci.utoronto.ca/news/chemistry-startup-northmirs-wins-250k-develop-heart-failure-treatment-sepsis-patients"
        },
        {
          "when": "Oct 2023",
          "text": "Named one of two inaugural Ontario ventures (with Quthero Canada) in the adMare BioInnovations / MaRS Discovery District Therapeutics Accelerator Program.",
          "type": "Recognition",
          "hl": false,
          "src": "adMare BioInnovations",
          "url": "https://www.admarebio.com/en/news-details/admare-bioinnovations-and-mars-discovery-district-welcome-inaugural-ontario-start-ups-to-therapeutics-accelerator-program"
        }
      ]
    }
  ];

/** The simplified public shape — company + recipient + track, and (VL only) a
 *  project name. Both the admin Recipients tab and the public JSON feed render
 *  this, so they never drift. */
export interface PublicRecipient {
  company: string;
  recipient: string;
  institution: string;
  track: EquipTrack;
  project?: string;
}

export function toPublicRecipients(): PublicRecipient[] {
  return EQUIP_RECIPIENTS.map((r) => ({
    company: r.name,
    recipient: r.founder,
    institution: r.inst,
    track: r.track,
    ...(r.project ? { project: r.project } : {}),
  }));
}
