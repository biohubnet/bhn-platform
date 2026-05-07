import type { FormField } from "./types";

// Talent Application form for the EXPERIENCE track. Mirrors the
// BioHubNet "Talent Application" intake on biohubnet.ca, adapted to the
// FormField schema. File uploads land in R2 via /api/forms/[slug]/upload.
export const TALENT_APPLICATION_DEFAULTS = {
  slug: "talent-application",
  title: "Experience — Talent Application Form",
  description:
    "Tell us about yourself, your studies, and what you're looking for. We'll share your application with vetted industry partners. Most fields are required; we keep your information confidential and use it only for matching.",
  fields: [
    { id: "section_personal", type: "section", label: "Personal information" },
    { id: "first_name", type: "text", label: "First Name", required: true },
    { id: "last_name",  type: "text", label: "Last Name",  required: true },
    { id: "email",      type: "email", label: "Email Address", required: true },
    { id: "applicant_id", type: "text", label: "Applicant ID", hint: "If you have one. Leave blank if this is your first application.", required: false, placeholder: "BHTAA0010" },
    {
      id: "current_position",
      type: "radio",
      label: "What best describes your current position / status?",
      required: true,
      options: ["Graduate Program", "Postdoctoral Fellow", "Other"],
    },
    {
      id: "support_letter",
      type: "file",
      label: "Support letter from your research supervisor",
      hint: "PDF, max 10 MB.",
      required: false,
      accept: "application/pdf,.pdf",
      maxBytes: 10 * 1024 * 1024,
    },
    {
      id: "earliest_availability",
      type: "date",
      label: "Earliest availability for full-time internship opportunities",
      required: true,
    },
    {
      id: "linkedin",
      type: "url",
      label: "LinkedIn profile URL",
      required: false,
      placeholder: "linkedin.com/in/yourprofile",
    },
    {
      id: "status_goal",
      type: "radio",
      label: "What is your current status and goal in joining BioHubNet?",
      required: true,
      options: [
        "Current student searching for internship opportunities",
        "New or soon-to-be graduate searching for full-time opportunities",
      ],
    },
    {
      id: "locations",
      type: "multicheckbox",
      label: "Which locations would you consider for an opportunity?",
      hint: "Pick every region you'd be open to. We won't share your application outside the regions you select.",
      required: true,
      options: [
        "British Columbia", "Alberta", "Saskatchewan", "Manitoba",
        "Ontario", "Quebec",
        "New Brunswick", "Nova Scotia", "Prince Edward Island", "Newfoundland and Labrador",
        "Remote / hybrid Canada-wide",
      ],
    },
    {
      id: "citizenship",
      type: "multicheckbox",
      label: "What is your citizenship status in Canada?",
      hint: "Used to identify eligibility for wage-subsidy programs. Pick all that apply.",
      required: true,
      options: [
        "Canadian Citizen",
        "Permanent Resident",
        "International Student",
        "Work Permit",
        "Other / prefer not to say",
      ],
    },

    { id: "section_french", type: "section", label: "French proficiency" },
    {
      id: "french_speaking",
      type: "select",
      label: "Speaking",
      required: false,
      options: ["Native / fluent", "Advanced", "Intermediate", "Basic", "None"],
    },
    {
      id: "french_reading",
      type: "select",
      label: "Reading",
      required: false,
      options: ["Native / fluent", "Advanced", "Intermediate", "Basic", "None"],
    },
    {
      id: "french_writing",
      type: "select",
      label: "Writing",
      required: false,
      options: ["Native / fluent", "Advanced", "Intermediate", "Basic", "None"],
    },

    { id: "section_education", type: "section", label: "Education" },
    {
      id: "thesis_or_contract_date",
      type: "date",
      label: "Thesis submission date (graduate) or last day of contract (postdoc)",
      hint: "Course-based grad? Use the date your degree is awarded.",
      required: true,
    },
    {
      id: "program_url",
      type: "url",
      label: "Official website of the degree programme you're affiliated with",
      hint: "Example: https://www.torontomu.ca/graduate/programs/computer-science/",
      required: true,
    },

    { id: "section_pitch", type: "section", label: "Introduce yourself" },
    {
      id: "pitch",
      type: "textarea",
      label: "650-character pitch",
      hint:
        "Describe yourself and what you bring. Mention area of study, interests, education, work experience, skills, strengths, career goals — and why you want to join the life-sciences industry. Don't include your name. Please write this yourself; do not use AI tools.",
      required: true,
      maxLength: 650,
    },

    { id: "section_video", type: "section", label: "Video interview sample" },
    {
      id: "video",
      type: "file",
      label: "One-minute video introduction",
      hint:
        "Without saying your name, briefly introduce yourself and answer: how do you approach a task you have no prior experience with? Use STAR (Situation, Task, Action, Result). Landscape mode, professional setting, no post-edits, max 40 MB. Videos longer than one minute will be disqualified.",
      required: false,
      accept: "video/mp4,video/quicktime,.mp4,.mov",
      maxBytes: 40 * 1024 * 1024,
    },

    { id: "section_documents", type: "section", label: "Documents" },
    {
      id: "resume",
      type: "file",
      label: "Resume / CV",
      hint:
        "PDF only, max 10 MB. Mask your name (e.g. J***), drop full address, phone and email. Two pages max. By uploading you agree to let BioHubNet share your resume with companies for internship consideration.",
      required: true,
      accept: "application/pdf,.pdf",
      maxBytes: 10 * 1024 * 1024,
    },
    {
      id: "supporting_document",
      type: "file",
      label: "Supporting document",
      hint:
        "Graduate students: latest unofficial transcript. Postdocs: offer letter or contract showing the last contract date. PDF only, max 10 MB. Reviewed only by application staff.",
      required: false,
      accept: "application/pdf,.pdf",
      maxBytes: 10 * 1024 * 1024,
    },

    { id: "section_connect", type: "section", label: "Connect with us" },
    {
      id: "linkedin_follow",
      type: "radio",
      label: "Follow our LinkedIn page for regular updates",
      required: false,
      options: ["Yes, I'm following the LinkedIn page", "No, I'm not interested"],
    },
    {
      id: "comments",
      type: "textarea",
      label: "Additional comments or feedback",
      required: false,
    },

    { id: "section_terms", type: "section", label: "Terms & conditions" },
    {
      id: "consent",
      type: "multicheckbox",
      label: "Confirm",
      hint:
        "By ticking, you confirm you've read and agreed to the privacy notice. The University of Toronto collects this information under section 2(14) of the University of Toronto Act, 1971. BioHubNet may share your information with administrative staff, affiliates, and training partners for registration and programme operations. Where possible, data is released in aggregate and de-identified. All information is stored encrypted and retained as long as needed for the programme. Protected under FIPPA. Questions: info@biohubnet.ca.",
      required: true,
      options: [
        "I have read and agreed to the privacy notice and terms above.",
      ],
    },
  ] as FormField[],
};
