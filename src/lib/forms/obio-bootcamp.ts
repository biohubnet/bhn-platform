import type { FormField } from "./types";

// Default schema for the OBIO Entrepreneurship Bootcamp registration
// form. Mirrors the public form on biohubnet.ca. Used to upsert the
// EventForm row on first visit; admin edits then take over.
export const OBIO_BOOTCAMP_DEFAULTS = {
  slug: "obio-bootcamp",
  title: "OBIO Entrepreneurship Bootcamp Registration",
  description:
    "Register for the OBIO Entrepreneurship Bootcamp. All fields marked required must be completed before you can submit.",
  fields: [
    { id: "section_personal", type: "section", label: "Personal Information" },
    { id: "name", type: "text", label: "Name", required: true },
    {
      id: "institution",
      type: "text",
      label: "Institution / Affiliation",
      required: true,
    },
    {
      id: "department",
      type: "text",
      label: "Department / Program",
      required: true,
    },
    {
      id: "current_role",
      type: "radio",
      label: "Current Role",
      required: true,
      options: [
        "Graduate Student (Master's or PhD)",
        "Postdoctoral Fellow",
        "Research Associate",
      ],
    },
    {
      id: "institution_email",
      type: "email",
      label: "Institution Email",
      required: true,
    },
    {
      id: "title_position",
      type: "text",
      label: "Title / Position in the Company",
      required: true,
    },
    {
      id: "time_commitment",
      type: "text",
      label: "Estimated Time Commitment to the Company (% or FTE)",
      required: true,
    },

    { id: "section_company", type: "section", label: "Company Information" },
    { id: "company_name", type: "text", label: "Company Name", required: true },
    {
      id: "website",
      type: "url",
      label: "Website (if available)",
      required: false,
    },
    {
      id: "linkedin",
      type: "url",
      label: "Company LinkedIn Page (if available)",
      required: false,
    },
    {
      id: "venture_description",
      type: "textarea",
      label: "Briefly describe your venture or innovation",
      hint: "What problem does it solve and what stage is it at?",
      required: true,
    },
    {
      id: "ip_status",
      type: "radio",
      label: "Intellectual Property (IP) Status",
      required: true,
      options: [
        "Invention Disclosure to Home Institution",
        "Provisional Patent Application Filed",
        "Full Patent Application Filed",
        "Licensed Technology",
      ],
    },
    {
      id: "pitch_competition",
      type: "radio",
      label: "Pitch Competition (Optional)",
      required: false,
      options: [
        "Yes, I would like to participate",
        "No, I am not interested",
      ],
    },
    {
      id: "travel_support",
      type: "text",
      label: "Travel / Accommodation Support",
      hint: "Do you require any support? Please describe.",
      required: false,
    },

    { id: "section_logistics", type: "section", label: "Catering & Accessibility" },
    {
      id: "dietary_restrictions",
      type: "textarea",
      label: "Dietary restrictions or food allergies",
      hint: "Vegetarian, vegan, halal, kosher, gluten-free, nut allergy, etc. We'll share with the bootcamp caterer. Leave blank if none.",
      required: false,
    },
    {
      id: "accessibility_needs",
      type: "textarea",
      label: "Accessibility needs",
      hint: "Wheelchair access, ASL interpreter, large-print materials — anything we should plan for. Leave blank if none.",
      required: false,
    },
  ] as FormField[],
};
