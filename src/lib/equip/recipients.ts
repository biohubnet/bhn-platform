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

export const EQUIP_UPDATED = "2026-06-22";

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
    "website": {
      "label": "rayyantherapeutics.com",
      "url": "https://rayyantherapeutics.com"
    },
    "status": "live",
    "statusText": "LinkedIn + website active",
    "posts": [
      {
        "when": "~7 mo ago",
        "text": "Founder Hasam Madarati named a finalist for the McMaster Postdoc Entrepreneur Fellowship — transforming stroke care.",
        "type": "Recognition",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/rayyantherapeutics/posts/"
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
      "url": "https://www.linkedin.com/company/neuropeutics-inc/"
    },
    "website": {
      "label": "neuropeutics.ca",
      "url": "https://neuropeutics.ca"
    },
    "status": "live",
    "statusText": "LinkedIn + website active",
    "posts": [
      {
        "when": "~6 days ago",
        "text": "Won 2nd Place and the People's Choice Investment Award at IDEA Mississauga Step-Up “Momentum to Millions” (~$6,000).",
        "type": "Award",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/neuropeutics-inc/posts/"
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
      "url": "https://www.linkedin.com/company/hdaxtx/"
    },
    "website": null,
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "~1 wk ago",
        "text": "Heading to BIO International 2026 (San Diego); sharing progress on ADPKD and cardiorenal disease.",
        "type": "Conference",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/hdaxtx/posts/"
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
    "founder": "Milad (applicant) · fdr. Parnian Majd",
    "inst": "University of Toronto / TMU",
    "linkedin": {
      "label": "company/myfibra",
      "url": "https://www.linkedin.com/company/myfibra/"
    },
    "website": {
      "label": "fibrainc.ca",
      "url": "https://fibrainc.ca"
    },
    "status": "live",
    "statusText": "LinkedIn + website active",
    "posts": [
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
      "label": "company/re-pair-genomics",
      "url": "https://www.linkedin.com/company/re-pair-genomics/"
    },
    "website": {
      "label": "repairgenomics.com",
      "url": "https://repairgenomics.com"
    },
    "status": "live",
    "statusText": "LinkedIn + website active",
    "posts": [
      {
        "when": "~1 mo ago",
        "text": "Took home the Runner-Up award at the femSTEM Pitch Competition.",
        "type": "Award",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/re-pair-genomics/posts/"
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
      "url": "https://www.linkedin.com/company/mvt-in-silico-corp/"
    },
    "website": {
      "label": "mvtinsilico.ca",
      "url": "https://mvtinsilico.ca"
    },
    "status": "live",
    "statusText": "LinkedIn + website active · mostly reposts",
    "posts": [
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
        "when": "2025",
        "text": "DialySnake (PD-catheter device); 2025 Hult Prize @ U of T runner-up; reached Hult Prize Global Finals (top 22).",
        "type": "Recognition",
        "hl": true,
        "src": "U of T Entrepreneurship",
        "url": "https://www.entrepreneurship.artsci.utoronto.ca/news/hult-prize-u-t-top-22-finalists-nephrotech-share-their-global-finals-journey-and-insights"
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
      "label": "velocity profile",
      "url": "https://www.velocityincubator.com/company/newgen-health"
    },
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "2025",
        "text": "Named in the University of Waterloo's “10 Waterloo entrepreneurs to watch”; 1st place at the Chrysalis Innovation Challenge.",
        "type": "Recognition",
        "hl": true,
        "src": "Waterloo News",
        "url": "https://uwaterloo.ca/news/10-waterloo-entrepreneurs-watch"
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
      "url": "https://www.linkedin.com/company/laetech/"
    },
    "website": null,
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "2025",
        "text": "Won 1st prize at Hult Prize OnCampus 2025; semi-finalist at the Rice Business Plan Competition.",
        "type": "Award",
        "hl": true,
        "src": "U of T Entrepreneurship",
        "url": "https://entrepreneurs.utoronto.ca/innovation-on-display-u-of-ts-2025-hult-prize-oncampus-pitch-competition/"
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
      "url": "https://www.linkedin.com/company/belaris-biotech/"
    },
    "website": null,
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "~2 wk ago",
        "text": "Selected for the IBZ Innovation Boost Zone fellowship (Stream 3) — 1 of 136 Ontario applicants.",
        "type": "Award",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/belaris-biotech/posts/"
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
      "url": "https://www.linkedin.com/company/synakis/"
    },
    "website": null,
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "~3 wk ago",
        "text": "Closed an oversubscribed CAD $2.6M pre-seed round for its retinal-therapeutics hydrogel platform (via GlycoNet).",
        "type": "Funding",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/synakis/posts/"
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
    "track": "VL",
    "rounds": "VL R2",
    "founder": "Sushant Singh",
    "inst": "University of Toronto",
    "linkedin": {
      "label": "company/vrit-inc",
      "url": "https://www.linkedin.com/company/vrit-inc/"
    },
    "website": null,
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "Mar 2026",
        "text": "Won the top overall prize ($40,000) at U of T's Desjardins Startup Prize; preparing a $3M pre-seed.",
        "type": "Award",
        "hl": true,
        "src": "U of T (Defy Gravity)",
        "url": "https://defygravitycampaign.utoronto.ca/news-and-stories/desjardins-prize-supports-u-of-t-bioprinting-startup/"
      },
      {
        "when": "~3 wk ago",
        "text": "Recognized in BetaKit's “Canada's Most Ambitious Companies” (2nd edition).",
        "type": "Recognition",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/vrit-inc/posts/"
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
      "url": "https://www.linkedin.com/company/fertileadinc/"
    },
    "website": null,
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "2025",
        "text": "Founder won the 2025 Mitacs Innovation Award (Canadian Start-Up Innovator of the Year); TMU Rising Star.",
        "type": "Award",
        "hl": true,
        "src": "TMU news",
        "url": "https://www.torontomu.ca/engineering-architectural-science/stories-events/stories/2026/02/dr-narjes-allahrabbi-wins-2025-mitacs-innovation-award/"
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
    "track": "VL",
    "rounds": "VL R2",
    "founder": "Stephanie Buryk-Iggers",
    "inst": "University of Toronto / UHN",
    "linkedin": {
      "label": "company/sparkedscreening",
      "url": "https://www.linkedin.com/company/sparkedscreening/"
    },
    "website": {
      "label": "sparkedscreening.com",
      "url": "https://sparkedscreening.com"
    },
    "status": "web",
    "statusText": "LinkedIn page exists but no posts published",
    "posts": [
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
      "url": "https://www.linkedin.com/company/oculummedical/"
    },
    "website": null,
    "status": "live",
    "statusText": "LinkedIn active",
    "posts": [
      {
        "when": "~2 mo ago",
        "text": "Feature: “Surgery Has Blind Spots. Oculum Is Fixing Them.” — Sunnybrook Medventions program.",
        "type": "Feature",
        "hl": true,
        "src": "LinkedIn post",
        "url": "https://www.linkedin.com/company/oculummedical/posts/"
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
    "status": "none",
    "statusText": "No company page / website — Velocity profile only",
    "posts": [
      {
        "when": "2025",
        "text": "Automated AMD screening device; joined Velocity incubator 2025. No LinkedIn page or website found.",
        "type": "Web only",
        "hl": false,
        "src": "velocityincubator.com",
        "url": "https://www.velocityincubator.com/"
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
        "when": "2025",
        "text": "Microneedle glucagon patch for hypoglycemia; placed 2nd in pitch; PRiME / MaRS JLABS showcase.",
        "type": "Recognition",
        "hl": true,
        "src": "UTEST profile",
        "url": "https://utest.to/startup/zearup-biomed/"
      }
    ]
  },
  {
    "name": "ChASE Biotherapeutics",
    "track": "VL",
    "rounds": "VL R4",
    "founder": "Quinton",
    "inst": "University",
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
        "when": "2026",
        "text": "Ovarian-cancer biosensor; took 3rd place (Early-Stage) at U of T's 2026 Desjardins Startup Prize.",
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
