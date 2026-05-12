import { redirect } from "next/navigation";
import { Ghost } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PhantomUsersClient, type PhantomRow } from "@/components/admin/PhantomUsersClient";
import { PHANTOM_TTL_DEFAULT_HOURS, PHANTOM_TTL_MAX_HOURS, PHANTOM_BATCH_MAX } from "@/lib/phantom";

/**
 * /admin/phantom-users — spawn-and-forget test accounts.
 *
 * SSR loads the list of currently-alive phantoms; the client component
 * owns the spawn form, the per-row actions (sign in / extend / delete),
 * and the "sweep now" trigger.
 *
 * Phantoms auto-expire on demoExpiresAt (default 24 h, max 7 d). The
 * hourly Vercel cron sweep deletes any whose TTL has passed — see
 * vercel.json. Admins don't have to remember to clean up.
 */
export default async function AdminPhantomUsersPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const phantoms = await prisma.user.findMany({
    where: {
      accountKind: "phantom",
      demoExpiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, email: true, name: true, role: true, credits: true,
      organization: true, jobTitle: true,
      magicToken: true, demoExpiresAt: true, createdAt: true,
      createdByAdmin: { select: { id: true, name: true, email: true } },
    },
  });

  const rows: PhantomRow[] = phantoms.map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    credits: p.credits,
    organization: p.organization,
    jobTitle: p.jobTitle,
    magicToken: p.magicToken,
    expiresAt: p.demoExpiresAt!.toISOString(),
    createdAt: p.createdAt.toISOString(),
    createdByAdminName: p.createdByAdmin?.name ?? p.createdByAdmin?.email ?? null,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Admin · Platform
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Ghost size={22} className="text-brand-600" />
          Phantom users
        </h1>
        <p className="text-sm text-muted mt-2 leading-snug max-w-3xl">
          Spawn ephemeral test accounts for one-day testing. Enroll them in
          courses, register them for events, exercise admin queues — they
          auto-delete after their TTL expires (default {PHANTOM_TTL_DEFAULT_HOURS} h, max{" "}
          {Math.round(PHANTOM_TTL_MAX_HOURS / 24)} d). The hourly cron sweep
          handles cleanup, so you don't have to remember.
        </p>
      </header>

      <PhantomUsersClient
        initialRows={rows}
        defaultHours={PHANTOM_TTL_DEFAULT_HOURS}
        maxHours={PHANTOM_TTL_MAX_HOURS}
        maxBatch={PHANTOM_BATCH_MAX}
      />
    </div>
  );
}
