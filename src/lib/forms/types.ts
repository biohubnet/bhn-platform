// Field schema for editable EventForm. Stored as JSON in the DB so
// admins can reshape labels / options / required without a migration.

export type FieldId = string;

/**
 * Conditional visibility rule for any field. When set, the field
 * is shown only if the referenced field's current value matches.
 *
 *   showWhen: { fieldId: "current_position",
 *               equals: ["Master's student", "PhD candidate"] }
 *
 * The renderer hides the field when the condition isn't met; the
 * server-side validator treats a hidden field as if `required:
 * false` (so a graduate-only field doesn't block a non-graduate
 * submission).
 */
export interface ConditionalRule {
  /** Id of another field on the same form whose value drives this
   *  field's visibility. */
  fieldId: FieldId;
  /** Show the field when the referenced value equals any of these.
   *  Single-string short-hand also accepted. */
  equals: string | string[];
}

interface BaseField {
  id: FieldId;
  label: string;
  hint?: string;
  /** Optional conditional visibility — see ConditionalRule. */
  showWhen?: ConditionalRule;
}

/** Returns true if a field's `showWhen` rule is satisfied (or
 *  absent). The current-value lookup needs the field id → value
 *  map the renderer / validator already holds. */
export function isConditionMet(
  rule: ConditionalRule | undefined,
  values: Record<FieldId, unknown>,
): boolean {
  if (!rule) return true;
  const current = values[rule.fieldId];
  const allowed = Array.isArray(rule.equals) ? rule.equals : [rule.equals];
  return typeof current === "string" && allowed.includes(current);
}

export interface SectionField extends BaseField {
  type: "section";
}

export interface InputField extends BaseField {
  type: "text" | "email" | "tel" | "url" | "textarea" | "date";
  required: boolean;
  placeholder?: string;
  /** Soft character cap on textareas — UI shows a counter. */
  maxLength?: number;
}

export interface ChoiceField extends BaseField {
  type: "radio" | "select" | "checkbox";
  required: boolean;
  options: string[];
}

/** Multi-select via a list of independent checkboxes. Stores string[]. */
export interface MultiCheckboxField extends BaseField {
  type: "multicheckbox";
  required: boolean;
  options: string[];
}

/** File upload — value is the public URL after R2 upload. */
export interface FileField extends BaseField {
  type: "file";
  required: boolean;
  /** MIME types or extensions for the file picker, e.g. "application/pdf,.pdf". */
  accept?: string;
  /** Max size in bytes. Default 10 MB. */
  maxBytes?: number;
}

export type FormField =
  | SectionField
  | InputField
  | ChoiceField
  | MultiCheckboxField
  | FileField;

export function isInputField(f: FormField): f is InputField {
  return ["text", "email", "tel", "url", "textarea", "date"].includes(f.type);
}

export function isChoiceField(f: FormField): f is ChoiceField {
  return ["radio", "select", "checkbox"].includes(f.type);
}

export function isMultiCheckboxField(f: FormField): f is MultiCheckboxField {
  return f.type === "multicheckbox";
}

export function isFileField(f: FormField): f is FileField {
  return f.type === "file";
}

export function isSectionField(f: FormField): f is SectionField {
  return f.type === "section";
}

export type AnswerField =
  | InputField
  | ChoiceField
  | MultiCheckboxField
  | FileField;

/** All non-section field labels in document order — used for CSV headers. */
export function answerFields(fields: FormField[]): AnswerField[] {
  return fields.filter((f): f is AnswerField => !isSectionField(f));
}
