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
      options: [
        "Master's student",
        "PhD candidate",
        "Postdoctoral Fellow",
        "Research Associate",
        "Lab Technician",
        "Industry Professional",
      ],
    },
    // ───── Graduate-program block ────────────────────────────────
    // Conditional: only shown when current_position is a graduate
    // role (Master's / PhD). Used to gather the institutional context
    // needed for the ENGAGE credit-application eligibility check —
    // institution, program, supervisor, expected graduation, plus the
    // grad-office verification file.
    {
      id: "section_grad_program",
      type: "section",
      label: "Graduate program details",
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    {
      id: "grad_program_type",
      type: "radio",
      label: "Is your graduate program thesis-based or course-based?",
      required: true,
      options: ["Thesis-based", "Course-based"],
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    // Doubly conditional: only when program is Course-based AND
    // current_position is still a graduate role. The visibility chain
    // helper (isFieldVisible) walks back to current_position, so
    // switching to a non-grad role hides this question too even though
    // the rule directly only references grad_program_type.
    {
      id: "grad_internship_required",
      type: "radio",
      label: "Is an internship required for the completion of the program?",
      required: true,
      options: ["Yes", "No"],
      showWhen: { fieldId: "grad_program_type", equals: "Course-based" },
    },
    {
      id: "grad_institution",
      type: "text",
      label: "Home institution",
      hint: "University where you're enrolled.",
      required: true,
      placeholder: "University of Toronto",
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    {
      id: "grad_program",
      type: "text",
      label: "Program / Department",
      required: true,
      placeholder: "Molecular Genetics, PhD",
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    {
      id: "grad_supervisor",
      type: "text",
      label: "Research supervisor's full name",
      required: true,
      placeholder: "Dr. Jane Smith",
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    {
      id: "grad_supervisor_email",
      type: "email",
      label: "Supervisor's institutional email",
      required: true,
      placeholder: "jane.smith@utoronto.ca",
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    {
      id: "grad_semesters_completed",
      type: "text",
      label: "Semesters completed in your current program",
      hint: "ENGAGE eligibility requires at least 2 semesters completed.",
      required: true,
      placeholder: "3",
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    {
      id: "grad_expected_graduation",
      type: "date",
      label: "Expected graduation date",
      required: true,
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    {
      id: "grad_office_verification",
      type: "file",
      label: "Graduate office verification (signed)",
      hint: "Verification form signed by your grad office, OR an unofficial transcript. PDF, max 10 MB. Required for ENGAGE credit eligibility.",
      required: false,
      accept: "application/pdf,.pdf",
      maxBytes: 10 * 1024 * 1024,
      showWhen: { fieldId: "current_position", equals: ["Master's student", "PhD candidate"] },
    },
    // ─────────────────────────────────────────────────────────────

    {
      id: "support_letter",
      type: "file",
      label: "Support letter from your research supervisor",
      hint: "Use the BioHubNet template below — download, fill out, sign, scan, and upload as PDF (max 10 MB).",
      required: false,
      accept: "application/pdf,.pdf",
      maxBytes: 10 * 1024 * 1024,
      templateUrl: "/templates/supervisor-support-letter.pdf",
      templateLabel: "Download supervisor support-letter template (PDF)",
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
        "Working professional exploring new opportunities",
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

    {
      id: "section_french",
      type: "section",
      label: "French proficiency",
      hint: "Self-rate your French across the three modes.",
      layout: "vertical-tabs",
    },
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
