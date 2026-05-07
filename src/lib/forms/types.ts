// Field schema for editable EventForm. Stored as JSON in the DB so
// admins can reshape labels / options / required without a migration.

export type FieldId = string;

interface BaseField {
  id: FieldId;
  label: string;
  hint?: string;
}

export interface SectionField extends BaseField {
  type: "section";
}

export interface InputField extends BaseField {
  type: "text" | "email" | "tel" | "url" | "textarea";
  required: boolean;
  placeholder?: string;
}

export interface ChoiceField extends BaseField {
  type: "radio" | "select" | "checkbox";
  required: boolean;
  options: string[];
}

export type FormField = SectionField | InputField | ChoiceField;

export function isInputField(f: FormField): f is InputField {
  return ["text", "email", "tel", "url", "textarea"].includes(f.type);
}

export function isChoiceField(f: FormField): f is ChoiceField {
  return ["radio", "select", "checkbox"].includes(f.type);
}

export function isSectionField(f: FormField): f is SectionField {
  return f.type === "section";
}

/** All non-section field labels in document order — used for CSV headers. */
export function answerFields(fields: FormField[]): (InputField | ChoiceField)[] {
  return fields.filter(
    (f): f is InputField | ChoiceField => !isSectionField(f)
  );
}
