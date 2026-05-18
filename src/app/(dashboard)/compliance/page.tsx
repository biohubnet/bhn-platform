/**
 * /compliance — legacy redirect.
 *
 * The compliance overview was admin-only from the start, but lived
 * at a root-level path that didn't match its peers
 * (`/admin/security`, `/admin/audit`, etc.). It moved to
 * `/admin/compliance` so the admin "Security & compliance" group
 * all shares one namespace. This redirect keeps any old bookmarks
 * + cross-page links working.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ComplianceLegacyRedirect(): never {
  redirect("/admin/compliance");
}
