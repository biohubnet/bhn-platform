import { requireRole, getSession } from "@/lib/auth";
import { Beaker } from "lucide-react";
import { SandboxPanel } from "@/components/admin/SandboxPanel";

export const dynamic = "force-dynamic";

export default async function SandboxesAdminPage() {
  await requireRole("admin");
  const session = await getSession();
  const meId = (session?.user as { id?: string } | undefined)?.id ?? "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
          <Beaker size={20} className="text-brand-600" />
          Sandbox accounts
        </h1>
        <p className="text-sm text-muted mt-1 max-w-3xl">
          Each admin has their own pair of dummy accounts — one Employer HR + one Trainee — for testing flows without polluting real data. Multiple admins can run their sandboxes in parallel without interfering with each other.
        </p>
      </header>

      <SandboxPanel meId={meId} />

      {/* Onboarding-style explainer for new admins */}
      <section className="bg-card border border-line rounded-2xl p-5 text-sm">
        <h2 className="font-semibold text-fg mb-3">How to use sandboxes</h2>
        <ol className="space-y-3 text-muted leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-fg">Spawn your sandbox</strong> above. It creates one Employer HR and one Trainee account tied to your admin login, plus a starter posting and a talent-application submission so the kanban, scoring, and interview flows all light up immediately.
          </li>
          <li>
            <strong className="text-fg">Open an incognito / private window</strong> (or a different browser profile). Sign in there with the sandbox employer or trainee credentials shown after spawning. You stay signed in as admin in your main window — switching back and forth is just a tab away.
          </li>
          <li>
            <strong className="text-fg">Click around freely.</strong> A persistent cyan banner appears at the top of every page in the sandbox window so you never confuse it with real data. Sandbox accounts use the same code paths as real users — what you see is what real users will see.
          </li>
          <li>
            <strong className="text-fg">When you&apos;re done</strong>, hit Reset to wipe and re-seed (handy between test runs) or Delete to clean up. Other admins&apos; sandboxes are visible in the list so you can spot who&apos;s testing what.
          </li>
        </ol>
      </section>
    </div>
  );
}
