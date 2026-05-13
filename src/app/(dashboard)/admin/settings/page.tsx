import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/admin/SettingsForm";

const DEFAULT_SETTINGS: Record<string, { label: string; description: string; default: string; type: string }> = {
  siteName: { label: "Site Name", description: "Displayed in the header and emails", default: "BHN Training Platform", type: "text" },
  logoUrl: { label: "Logo URL", description: "URL to the platform logo image", default: "", type: "url" },
  defaultPassingScore: { label: "Default Passing Score (%)", description: "Default passing threshold for new courses", default: "80", type: "number" },
  sessionTimeoutMinutes: { label: "Session Timeout (minutes)", description: "Idle session timeout", default: "60", type: "number" },
  allowSelfRegistration: { label: "Allow Self-Registration", description: "Allow users to register without admin invite", default: "true", type: "boolean" },
  defaultUserCredits: { label: "Default User Credits", description: "Credits granted to new users on registration", default: "5000", type: "number" },
  traineeCourseLimit: { label: "Concurrent Course Limit (trainees)", description: "How many active courses a trainee can hold at once. Admins and superadmins bypass this cap (a warning popup reminds them the cap still applies to learners).", default: "3", type: "number" },
  supportEmail: { label: "Support Email", description: "Shown to learners for help requests", default: "", type: "email" },
  maintenanceMode: { label: "Maintenance Mode", description: "Show maintenance message to all users", default: "false", type: "boolean" },
};

export default async function AdminSettingsPage() {
  const session = await requireRole("superadmin").catch(() => null);
  if (!session) redirect("/admin");

  const stored = await prisma.platformSetting.findMany();
  const values: Record<string, string> = {};
  for (const s of stored) values[s.key] = s.value;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Platform Settings</h1>
        <p className="text-muted text-sm mt-1">Superadmin only. Changes take effect immediately.</p>
      </div>
      <SettingsForm defaults={DEFAULT_SETTINGS} values={values} />
    </div>
  );
}
