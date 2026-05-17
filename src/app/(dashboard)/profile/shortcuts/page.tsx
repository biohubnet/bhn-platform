import { getSession } from "@/lib/auth";
import { ShortcutSettings } from "@/components/system/ShortcutSettings";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * /profile/shortcuts — per-device keyboard-shortcut configurator.
 *
 * Bindings live in localStorage (see src/lib/shortcuts.ts) so each
 * device keeps its own mapping. The page is open to every signed-in
 * user; staff-only actions like Quick role-toggle are hidden from
 * trainees by the client component when they have no use for them.
 */
export default async function ShortcutsPage() {
  const session = await getSession();
  const realRole = (session!.user as { realRole?: string; role?: string }).realRole
    ?? (session!.user as { role?: string }).role
    ?? "trainee";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Keyboard Shortcuts"
        description="Rebind any shortcut by pressing the new key. Stored on this device — each browser keeps its own mapping."
      />
      <ShortcutSettings realRole={realRole} />
    </div>
  );
}
