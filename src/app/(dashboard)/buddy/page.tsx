import { requireSession, isStaff as checkIsStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Users, ArrowRight, Sparkles, Inbox, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BuddyInviteButton } from "@/components/lms/BuddyInviteButton";
import { BuddyInviteResponseButtons } from "@/components/lms/BuddyInviteResponseButtons";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

interface PairRow {
  id: string;
  status: string;
  initiatorId: string;
  partnerId: string;
  focusType: string | null;
  focusId: string | null;
  goalNote: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;
  endedAt: Date | null;
  initiator: { id: string; name: string | null; email: string; jobTitle: string | null; organization: string | null };
  partner:   { id: string; name: string | null; email: string; jobTitle: string | null; organization: string | null };
  _count: { messages: number };
}

const FOCUS_LABEL = (t: string | null) => t === "course" ? "Course" : t === "pathway" ? "Pathway" : "Open accountability";

export default async function BuddyHubPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  const pairs = (await prisma.buddyPair.findMany({
    where: { OR: [{ initiatorId: userId }, { partnerId: userId }] },
    include: {
      initiator: { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
      partner:   { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
      _count:    { select: { messages: true } },
    },
    orderBy: [{ status: "asc" }, { invitedAt: "desc" }],
  })) as unknown as PairRow[];

  const incoming = pairs.filter((p) => p.status === "invited" && p.partnerId === userId);
  const outgoing = pairs.filter((p) => p.status === "invited" && p.initiatorId === userId);
  const active   = pairs.filter((p) => p.status === "active");
  const past     = pairs.filter((p) => p.status === "ended" || p.status === "declined");

  // Look up focus titles in batch
  const courseIds  = pairs.filter((p) => p.focusType === "course"  && p.focusId).map((p) => p.focusId!) as string[];
  const pathwayIds = pairs.filter((p) => p.focusType === "pathway" && p.focusId).map((p) => p.focusId!) as string[];
  const [courses, pathways] = await Promise.all([
    courseIds.length  ? prisma.course.findMany({ where: { id: { in: courseIds  } }, select: { id: true, title: true } }) : Promise.resolve([]),
    pathwayIds.length ? prisma.pathway.findMany({ where: { id: { in: pathwayIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
  ]);
  const focusTitle: Record<string, string> = {};
  for (const c of courses)  focusTitle[`course:${c.id}`]  = c.title;
  for (const p of pathways) focusTitle[`pathway:${p.id}`] = p.title;

  function otherSide(p: PairRow) {
    return p.initiatorId === userId ? p.partner : p.initiator;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning buddies"
        description="Pair up with someone for accountability — share a goal, see each other's progress, and leave notes."
        actions={<BuddyInviteButton />}
      />

      {/* Admin-only seed/clear. Demo pairs land on the calling
          admin's own user with [demo] in the goalNote — Clear finds
          them exactly. Real buddy pairs the admin participates in
          are not touched. */}
      {isStaff && (
        <DemoSeedAndClearTray
          entity="user_buddy_pair"
          noun="demo buddy pairs"
          clearHelp="Delete BuddyPair rows where you're initiator or partner AND the goalNote starts with [demo]. Real buddy pairs are not touched."
        />
      )}

      {/* Incoming invites — high priority */}
      {incoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
            <Inbox size={14} /> Invites for you · {incoming.length}
          </h2>
          {incoming.map((p) => {
            const them = p.initiator;
            const focusKey = p.focusType && p.focusId ? `${p.focusType}:${p.focusId}` : null;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar name={them.name ?? them.email} className="bg-gradient-to-br from-amber-400 to-amber-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-fg">{them.name ?? them.email}</span>
                      <span className="text-muted"> wants to be your learning buddy</span>
                    </p>
                    <p className="text-xs text-subtle mt-0.5">
                      {them.jobTitle && `${them.jobTitle} · `}{them.organization ?? them.email}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge tone="brand">{FOCUS_LABEL(p.focusType)}</Badge>
                      {focusKey && focusTitle[focusKey] && (
                        <span className="text-xs text-muted">{focusTitle[focusKey]}</span>
                      )}
                    </div>
                    {p.goalNote && (
                      <p className="text-sm text-muted bg-elevated rounded-lg p-3 mt-3 whitespace-pre-line leading-relaxed">
                        {p.goalNote}
                      </p>
                    )}
                  </div>
                  <BuddyInviteResponseButtons pairId={p.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active pairs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
          <Users size={14} /> Active buddies · {active.length}
        </h2>
        {active.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
              <Sparkles size={20} />
            </div>
            <p className="font-medium text-fg">No active buddy yet</p>
            <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
              Find someone to learn alongside — pick a course or pathway to focus on, or just keep each other accountable.
            </p>
            <div className="mt-4">
              <BuddyInviteButton />
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {active.map((p) => {
              const them = otherSide(p);
              const focusKey = p.focusType && p.focusId ? `${p.focusType}:${p.focusId}` : null;
              return (
                <Link
                  key={p.id}
                  href={`/buddy/${p.id}`}
                  className="bg-card rounded-2xl border border-line p-5 hover:border-brand-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={them.name ?? them.email} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-fg truncate group-hover:text-brand-700 transition-colors">
                        {them.name ?? them.email}
                      </p>
                      <p className="text-xs text-subtle truncate">
                        {[them.jobTitle, them.organization].filter(Boolean).join(" · ") || them.email}
                      </p>
                    </div>
                    {p._count.messages > 0 && (
                      <span className="text-xs text-subtle inline-flex items-center gap-1">
                        <MessageSquare size={11} /> {p._count.messages}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="brand">{FOCUS_LABEL(p.focusType)}</Badge>
                    {focusKey && focusTitle[focusKey] && (
                      <span className="text-xs text-muted truncate">{focusTitle[focusKey]}</span>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-brand-600 font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    Open buddy view <ArrowRight size={12} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Outgoing invites */}
      {outgoing.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Awaiting reply · {outgoing.length}
          </h2>
          {outgoing.map((p) => (
            <Card key={p.id} className="p-4 flex items-center gap-3">
              <Avatar name={p.partner.name ?? p.partner.email} className="opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  Invited <span className="font-medium text-fg">{p.partner.name ?? p.partner.email}</span>
                </p>
                <p className="text-xs text-subtle">{new Date(p.invitedAt).toLocaleDateString()}</p>
              </div>
              <Badge tone="amber">Pending</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted cursor-pointer select-none">
            Past buddies · {past.length}
          </summary>
          <div className="mt-3 space-y-2">
            {past.map((p) => {
              const them = otherSide(p);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2 bg-card border border-line rounded-lg text-sm">
                  <Avatar name={them.name ?? them.email} small className="opacity-50" />
                  <span className="flex-1 truncate text-muted">{them.name ?? them.email}</span>
                  <span className="text-xs text-subtle capitalize">{p.status}</span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

function Avatar({ name, small, className = "" }: { name: string; small?: boolean; className?: string }) {
  const size = small ? "w-7 h-7 text-xs" : "w-11 h-11 text-base";
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold shadow-md shadow-brand-600/20 shrink-0 ${className}`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}
