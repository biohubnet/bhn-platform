/**
 * Offer-letter templates.
 *
 * Three starter variants — paid internship, unpaid (academic-credit),
 * contract. Each is markdown with `{{variable}}` placeholders the
 * UI fills in. Kept hardcoded for v1 so the templates version with
 * the codebase + go through PR review; if the catalogue grows past
 * ~6 templates, hoist to a DB-backed editable surface.
 */

export interface OfferTemplate {
  key: string;
  label: string;
  description: string;
  /** Markdown body with {{variableName}} placeholders. */
  body: string;
}

const SHARED_FOOTER = `

---

This offer is made by **{{companyName}}** in connection with the
BioHubNet trainee programme. Acceptance is recorded on the platform
with a timestamped electronic signature (21 CFR Part 11 §11.50 +
§11.70 patterns); a copy is retained on your application record.

If you have questions before responding, reach out to {{employerName}}
directly or to support@biohubnet.ca.
`;

export const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    key: "paid-internship",
    label: "Paid internship",
    description: "Standard paid internship — compensation, hours, dates.",
    body:
      `**Offer of Internship**

Dear {{traineeName}},

{{companyName}} is pleased to offer you an internship in the role of
**{{postingTitle}}**.

**The terms:**

- **Compensation:** {{compensation}}
- **Start date:** {{startDate}}
- **End date:** {{endDate}}
- **Hours:** {{hoursPerWeek}}
- **Location:** {{location}}

This offer is contingent on your ability to complete any onboarding
paperwork {{companyName}} sends within seven business days of
acceptance.

Please respond by **{{acceptDeadline}}**.` + SHARED_FOOTER,
  },
  {
    key: "academic-credit",
    label: "Unpaid (academic credit)",
    description: "Academic-credit placement — no compensation; cite the institution's credit framework.",
    body:
      `**Offer of Internship — Academic Credit Placement**

Dear {{traineeName}},

{{companyName}} is pleased to offer you a placement as a
**{{postingTitle}}**.

This is an unpaid placement structured around academic credit
through your home institution. The terms below align with that
framework.

- **Start date:** {{startDate}}
- **End date:** {{endDate}}
- **Hours:** {{hoursPerWeek}}
- **Location:** {{location}}
- **Compensation:** {{compensation}}

The placement is contingent on confirmation from your institution's
internship coordinator that academic credit will be granted.

Please respond by **{{acceptDeadline}}**.` + SHARED_FOOTER,
  },
  {
    key: "contract",
    label: "Contract role",
    description: "Fixed-term contract — fixed-end date, defined deliverables.",
    body:
      `**Offer of Contract Engagement**

Dear {{traineeName}},

{{companyName}} is pleased to offer you a fixed-term contract
engagement as **{{postingTitle}}**.

**Terms:**

- **Compensation:** {{compensation}}
- **Start date:** {{startDate}}
- **End date:** {{endDate}}
- **Hours:** {{hoursPerWeek}}
- **Location:** {{location}}

This engagement is governed by a separate contract addendum that
{{companyName}} will share before the start date.

Please respond by **{{acceptDeadline}}**.` + SHARED_FOOTER,
  },
];

/** Returns the template by key, or null when the key isn't known. */
export function getOfferTemplate(key: string): OfferTemplate | null {
  return OFFER_TEMPLATES.find((t) => t.key === key) ?? null;
}

/**
 * Substitute {{variables}} into a template body. Unknown variables
 * are left in place (visible in the rendered output so the gap is
 * obvious + correctable).
 */
export function renderOfferTemplate(
  body: string,
  vars: Record<string, string | null | undefined>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (full, name: string) => {
    const v = vars[name];
    return v ? String(v) : full;
  });
}
