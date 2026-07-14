/**
 * EQUIP tracking-report dossier — single source of the rendered HTML.
 *
 * The dossier is a self-contained HTML artifact (tracker.json) with a
 * `__EQUIP_DATA__` placeholder. We inject the curated recipient roster at
 * render time so the dossier and the public recipients feed can never
 * drift. Both surfaces call this one function:
 *   • /admin/equip/tracker?view=report  (admin, inside an <iframe srcDoc>)
 *   • /share/equip-report/[token]        (public, no login, same srcDoc)
 *
 * Server-only in practice (imports a 16 KB JSON), but pure — no I/O.
 */
import tracker from "./tracker.json";
import { EQUIP_RECIPIENTS, EQUIP_UPDATED } from "./recipients";

/**
 * The dossier HTML with the current curated data injected.
 *
 * @param opts.publicView  When true, renders the hardened variant served on the
 *   no-login /share/equip-report/[token] page: the admin-only "copy rescan
 *   prompt" button is hidden, and an `img-src` CSP blocks the company-logo
 *   fetches so an external viewer's browser never beacons the recipient set (or
 *   their IP) to a third party (Clearbit, and its Google-favicon fallback). The
 *   artifact already degrades to initials when a logo fails to load.
 */
export function renderEquipDossierHtml(opts?: { publicView?: boolean }): string {
  // Inject the roster with split/join (not String.replace) so `$`-sequences in
  // the data can't be interpreted as replacement patterns, and escape `<` so a
  // stray `</script>` in future rescan data can't break out of the dossier's
  // inline <script>. Current data has no `<`, so this is byte-identical today.
  const json = JSON.stringify({ updated: EQUIP_UPDATED, companies: EQUIP_RECIPIENTS }).replace(
    /</g,
    "\\u003c",
  );
  let html = tracker.html.split("__EQUIP_DATA__").join(json);

  if (opts?.publicView) {
    // Injected before </head>, so it governs the body's <img> tags (blocking the
    // logo beacons) while the Google-Fonts <link> earlier in <head> is untouched.
    // The rescan button stays in the DOM (so the artifact's own script binding
    // can't null-deref) but is hidden.
    html = html.replace(
      "</head>",
      `<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:;"><style>#rescanBtn{display:none!important}</style></head>`,
    );
  }
  return html;
}
