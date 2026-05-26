/**
 * /admin/simulator-requests — admin queue of user-submitted sim
 * requests. Tabs filter by status; click a row to open the detail
 * page with action buttons (Generate / Hand-author / Reject / Reopen).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Theater, Hourglass, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getSession, ROLE_RANK } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "generating", "ready", "failed", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_META: Record<
  Status,
  { label: string; cls: string; Icon: typeof Hourglass }
> = {
  pending:    { label: "Pending",    cls: "bg-amber-50 text-amber-800 ring-amber-200",   Icon: Hourglass    },
  generating: { label: "Generating", cls: "bg-sky-50 text-sky-800 ring-sky-200",         Icon: Clock        },
  ready:      { label: "Ready",      cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", Icon: CheckCircle2 },
  failed:     { label: "Failed",     cls: "bg-rose-50 text-rose-800 ring-rose-200",      Icon: XCircle      },
  rejected:   { label: "Rejected",   cls: "bg-rose-50 text-rose-800 ring-rose-200",      Icon: XCircle      },
};

function isStatus(s: string): s is Status {
  return (STATUSES as readonly string[]).includes(s);
}

export default async function AdminSimRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/admin/simulator-requests");
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (ROLE_RANK[role] < ROLE_RANK.admin) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const activeStatus: Status | "all" =
    sp.status && (sp.status === "all" || isStatus(sp.status))
      ? (sp.status as Status | "all")
      : "pending";

  const where = activeStatus === "all" ? {} : { status: activeStatus };

  // FIFO for in-flight, LIFO for terminal — same ordering the API uses.
  const orderBy: { createdAt: "asc" | "desc" } =
    activeStatus === "pending" || activeStatus === "generating"
      ? { createdAt: "asc" }
      : { createdAt: "desc" };

  const [rows, counts] = await Promise.all([
    prisma.simulationRequest.findMany({
      where,
      orderBy,
      take: 200,
      select: {
        id: true,
        sourceUrl: true,
        jdBody: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        processedAt: true,
        user: { select: { id: true, name: true, email: true } },
        simulation: { select: { id: true, jobTitle: true, companyName: true } },
      },
    }),
    prisma.simulationRequest.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);
  const countsByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count.status]),
  );
  const totalAll = Object.values(countsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={
          <>
            <Theater size={11} /> Admin · Simulator
          </>
        }
        title="Simulation requests"
        description="Users submit job postings here; you review the JD and either run the AI generator, hand-author a payload, or reject with a reason. Failed AI runs land in 'Failed' for retry."
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Tabs */}
        <nav className="flex flex-wrap gap-1.5 text-[12px]">
          <TabLink
            label="All"
            status="all"
            active={activeStatus === "all"}
            count={totalAll}
          />
          {STATUSES.map((s) => (
            <TabLink
              key={s}
              label={STATUS_META[s].label}
              status={s}
              active={activeStatus === s}
              count={countsByStatus[s] ?? 0}
            />
          ))}
        </nav>

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-12 text-center text-sm text-muted">
            No requests with this status.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-line">
            <table className="w-full text-[13px]">
              <thead className="bg-elevated/40 text-[10px] uppercase tracking-[0.15em] text-subtle">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Requester</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Posting</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Submitted</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const meta = STATUS_META[row.status as Status] ?? STATUS_META.pending;
                  const title = row.simulation?.jobTitle ?? snippetTitle(row.jdBody);
                  return (
                    <tr key={row.id} className="hover:bg-elevated/30 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-fg">
                          {row.user.name ?? row.user.email}
                        </div>
                        {row.user.name && (
                          <div className="text-[11px] text-subtle">{row.user.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top max-w-md">
                        <div className="font-medium text-fg line-clamp-2">{title}</div>
                        {row.simulation?.companyName && (
                          <div className="text-[11px] text-subtle">
                            {row.simulation.companyName}
                          </div>
                        )}
                        {row.sourceUrl && (
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block max-w-full truncate text-[11px] text-brand-700 hover:underline"
                          >
                            {row.sourceUrl}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset",
                            meta.cls,
                          ].join(" ")}
                        >
                          <meta.Icon className="h-3 w-3" /> {meta.label}
                        </span>
                        {row.adminNotes && (
                          <p className="mt-1 line-clamp-2 text-[11px] italic text-fg-muted">
                            {row.adminNotes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-[11.5px] text-fg-muted whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <Link
                          href={`/admin/simulator-requests/${row.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TabLink({
  label,
  status,
  active,
  count,
}: {
  label: string;
  status: Status | "all";
  active: boolean;
  count: number;
}) {
  return (
    <Link
      href={`/admin/simulator-requests?status=${status}`}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ring-1 ring-inset transition-colors",
        active
          ? "bg-brand-100 text-brand-800 ring-brand-200"
          : "bg-card text-muted ring-line hover:bg-elevated",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
          active ? "bg-brand-200 text-brand-900" : "bg-elevated text-fg-muted",
        ].join(" ")}
      >
        {count}
      </span>
    </Link>
  );
}

function snippetTitle(jd: string): string {
  const firstLine = jd.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
  if (!firstLine) return "Submitted posting";
  return firstLine.length > 80 ? `${firstLine.slice(0, 78)}…` : firstLine;
}
