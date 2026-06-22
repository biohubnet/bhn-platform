import type { FormField } from "./types";

// Employer-intake ("Hire an intern") lead form for the EXPERIENCE pillar.
// Public-facing: an employer fills this on biohubnet.ca/hire-an-intern (which
// POSTs to /api/public/employer-intake) or on the platform at /forms/
// employer-intake. Submissions land as EventFormSubmission rows and surface in
// Admin → Experience → Employer intake.
//
// Field ids are the stable contract the external page posts against — DO NOT
// rename them without updating the public endpoint + the Codex prompt.
export const EMPLOYER_INTAKE_DEFAULTS = {
  slug: "employer-intake",
  title: "Hire an intern — employer intake",
  description:
    "Tell us a little about your organization and who you're looking to hire. We'll follow up to match you with vetted early-career biomanufacturing talent.",
  fields: [
    { id: "name", type: "text", label: "Your name", required: true },
    { id: "email", type: "email", label: "Work email", required: true },
    { id: "organization", type: "text", label: "Organization", required: true },
    { id: "title", type: "text", label: "Your title", required: false },
    { id: "website", type: "url", label: "Organization website", required: false, placeholder: "https://" },
    { id: "address", type: "text", label: "Organization address", required: false },
    {
      id: "hiring_timeline",
      type: "select",
      label: "Are you hiring interns or early talent soon?",
      required: false,
      options: [
        "Immediately",
        "Within 3 months",
        "Within 6 months",
        "Within 12 months",
        "No immediate plans",
      ],
    },
    {
      id: "needs",
      type: "textarea",
      label: "What expertise or talent are you looking for?",
      required: false,
      maxLength: 2000,
    },
  ] as FormField[],
};
