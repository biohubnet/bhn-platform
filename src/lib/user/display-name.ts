/**
 * Display-name resolution for greetings ("Welcome back, X.").
 *
 * Users have two name-shaped fields:
 *   • `name`           — their full / legal name. Source of truth
 *                        for records, certificates, emails.
 *   • `preferredName`  — how they want to be greeted. Free-form so
 *                        users can pick "First", "First Middle",
 *                        "Dr. Last", "Prof. Last", a single mononym,
 *                        a nickname, or anything else.
 *
 * `getDisplayName` is the canonical reader: pulls preferredName if
 * set, falls back to the full name, falls back to the local-part of
 * the email so we always have SOMETHING to render. Never returns
 * an empty string — worst case "there".
 *
 * `suggestDisplayNames` does NLP-light tokenisation of the full
 * name to produce candidate greetings the UI can show as one-click
 * chips ("First", "First Middle", "First Last"). Honest about its
 * limitations: it doesn't know whether "Yoo Jin Kim" is
 * Western-order (last name Kim) or East-Asian-order (family name
 * Yoo, given Jin Kim) — it just generates the obvious slicings and
 * lets the user pick.
 */

/** Common honorifics — used to suggest "Dr. Last" / "Prof. Last"
 *  forms. The user can also type their own (Hon., Rev., etc.). */
export const HONORIFIC_SUGGESTIONS = [
  "Dr.", "Prof.", "Mr.", "Ms.", "Mrs.", "Mx.",
] as const;

export type DisplayNameInput = {
  preferredName?: string | null;
  name?: string | null;
  email?: string | null;
};

/** Resolve what to greet the user as. Always returns a non-empty
 *  string — the platform should never render an empty welcome. */
export function getDisplayName(user: DisplayNameInput | null | undefined): string {
  if (!user) return "there";
  const pref = user.preferredName?.trim();
  if (pref) return pref;
  const full = user.name?.trim();
  if (full) return full;
  // Fall back to the local-part of the email — better than "there"
  // for surfaces that show the greeting in headers.
  if (user.email) {
    const local = user.email.split("@")[0]?.trim();
    if (local) return local;
  }
  return "there";
}

/** Generate up to ~6 plausible greeting forms from the user's full
 *  name. Returns canonical suggestions de-duplicated, in priority
 *  order:
 *
 *    1. First token
 *    2. Full name (if multi-token)
 *    3. First two tokens (only meaningful for 3+ tokens)
 *    4. First + last (only meaningful for 3+ tokens)
 *    5. (For each common honorific, "Honorific Last") — last token
 *       only when there are 2+ tokens
 *
 *  Honorifics are NOT suggested for single-token names ("Beyoncé")
 *  because there's no last name to attach them to. The UI can still
 *  offer them as a manual entry.
 *
 *  Returns empty array when input is empty/null. */
export function suggestDisplayNames(fullName: string | null | undefined): string[] {
  const trimmed = fullName?.trim();
  if (!trimmed) return [];
  // Collapse internal whitespace runs into single spaces so funky
  // copy-paste ("Yoo  Jin") doesn't produce weird candidates.
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];

  const out: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t && !out.includes(t)) out.push(t);
  };

  push(parts[0]);                          // first token
  push(parts.join(" "));                   // full name
  if (parts.length >= 3) {
    push(parts.slice(0, 2).join(" "));     // first + middle
    push(`${parts[0]} ${parts[parts.length - 1]}`); // first + last
  }
  // Honorifics + last token (only if 2+ tokens)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    for (const h of HONORIFIC_SUGGESTIONS) {
      push(`${h} ${last}`);
    }
  }
  return out;
}
