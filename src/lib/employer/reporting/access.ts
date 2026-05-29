/**
 * Shared auth/company resolution for every /employer/reports page +
 * export route. Mirrors the gate used across the employer surface
 * (getSession → role check → resolveWorkspaceCompanyId), deduped so the
 * dozen report pages don't each repeat it.
 */
import { getSession } from "@/lib/auth";
import { resolveWorkspaceCompanyId } from "@/lib/employer/admin-preview";

export type ReportAccess =
  | { ok: true; companyId: string; userId: string; realRole: string }
  | { ok: false; reason: "unauth" | "forbidden" | "no_company" };

export async function resolveReportAccess(): Promise<ReportAccess> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauth" };

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role ?? "trainee";
  const realRole = (session.user as { realRole?: string }).realRole ?? userRole;
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  if (userRole !== "employer" && !isAdmin) return { ok: false, reason: "forbidden" };

  const companyId = await resolveWorkspaceCompanyId(userId, realRole).catch(() => null);
  if (!companyId) return { ok: false, reason: "no_company" };

  return { ok: true, companyId, userId, realRole };
}
