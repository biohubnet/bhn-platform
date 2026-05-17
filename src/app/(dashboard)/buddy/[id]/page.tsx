import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Layers, BookOpen, Award, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BuddyChat } from "@/components/lms/BuddyChat";
import { BuddyEndButton } from "@/components/lms/BuddyEndButton";

const FOCUS_LABEL = (t: string | null) => t === "course" ? "Course" : t === "pathway" ? "Pathway" : "Open accountability";

export default async function BuddyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const me = (session.user as { id?: string }).id!;
  const { id } = await params;

  const pair = await prisma.buddyPair.findUnique({
    where: { id },
    include: {
      initiator: { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
      partner:   { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
    },
  });
  if (!pair) notFound();
  if (pair.initiatorId !== me && pair.partnerId !== me) notFound();
  if (pair.status !== "active") {
    // Past or pending pairs: send them back to the hub
    redirect("/buddy");
  }

  const them = pair.initiatorId === me ? pair.partner : pair.initiator;
  const youIds = [me, them.id];

  // Build the focus card
  let focusBlock: { title: string; subtitle: string; href: string } | null = null;
  let myStats = null as null | { progress: number; status: string; score: number | null };
  let theirStats = null as null | { progress: number; status: string; score: number | null };

  if (pair.focusType === "course" && pair.focusId) {
    const course = await prisma.course.findUnique({
      where: { id: pair.focusId },
      select: { id: true, title: true, category: true },
    });
    const enrolls = await prisma.enrollment.findMany({
      where: { courseId: pair.focusId, userId: { in: youIds } },
      select: { userId: true, progress: true, status: true, score: true },
    });
    if (course) {
      focusBlock = { title: course.title, subtitle: course.category ?? "Course", href: `/courses/${course.id}` };
      const myE   = enrolls.find((e) => e.userId === me);
      const themE = enrolls.find((e) => e.userId === them.id);
      myStats    = myE   ? { progress: myE.progress,   status: myE.status,   score: myE.score   } : { progress: 0, status: "not enrolled", score: null };
      theirStats = themE ? { progress: themE.progress, status: themE.status, score: themE.score } : { progress: 0, status: "not enrolled", score: null };
    }
  } else if (pair.focusType === "pathway" && pair.focusId) {
    const pathway = await prisma.pathway.findUnique({
      where: { id: pair.focusId },
      include: { courses: { select: { courseId: true } } },
    });
    if (pathway) {
      focusBlock = { title: pathway.title, subtitle: "Training pathway", href: `/pathways/${pathway.id}` };
      const courseIds = pathway.courses.map((c) => c.courseId);
      const enrolls = await prisma.enrollment.findMany({
        where: { courseId: { in: courseIds }, userId: { in: youIds } },
        select: { userId: true, status: true, progress: true },
      });
      const compute = (uid: string) => {
        const mine = enrolls.filter((e) => e.userId === uid);
        const completed = mine.filter((e) => e.status === "completed" || e.status === "passed").length;
        const overall = courseIds.length === 0 ? 0 : Math.round((completed / courseIds.length) * 100);
        return { progress: overall, status: completed === courseIds.length && courseIds.length > 0 ? "completed" : "in progress", score: null };
      };
      myStats    = compute(me);
      theirStats = compute(them.id);
    }
  }

  // General stats both sides expose
  const [myCerts, theirCerts, myActive, theirActive] = await Promise.all([
    prisma.certificate.count({ where: { userId: me, revokedAt: null } }),
    prisma.certificate.count({ where: { userId: them.id, revokedAt: null } }),
    prisma.enrollment.count({ where: { userId: me, status: "active" } }),
    prisma.enrollment.count({ where: { userId: them.id, status: "active" } }),
  ]);

  // Recent activity from THEIR side that we're allowed to share —
  // limited to enrollment status changes (course completions / starts)
  const theirActivity = await prisma.enrollment.findMany({
    where: { userId: them.id, OR: [{ completedAt: { not: null } }, { progress: { gt: 0 } }] },
    include: { course: { select: { id: true, title: true } } },
    orderBy: { enrolledAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/buddy" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Back to learning buddies
      </Link>

      <PageHeader
        title={them.name ?? them.email}
        description={[them.jobTitle, them.organization].filter(Boolean).join(" · ") || them.email}
        actions={<BuddyEndButton pairId={pair.id} />}
      />

      {/* Focus banner */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              {pair.focusType === "pathway" ? <Layers size={18} /> : pair.focusType === "course" ? <BookOpen size={18} /> : <Award size={18} />}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-subtle">Focus · {FOCUS_LABEL(pair.focusType)}</p>
              {focusBlock ? (
                <Link href={focusBlock.href} className="font-semibold text-fg hover:text-brand-700">{focusBlock.title}</Link>
              ) : (
                <p className="font-semibold text-fg">Open accountability</p>
              )}
            </div>
          </div>
          <Badge tone="success">Active since {pair.acceptedAt ? new Date(pair.acceptedAt).toLocaleDateString() : "—"}</Badge>
        </div>
        {pair.goalNote && (
          <p className="text-sm text-muted bg-elevated rounded-lg p-3 mt-4 leading-relaxed whitespace-pre-line">
            {pair.goalNote}
          </p>
        )}
      </Card>

      {/* Side-by-side progress */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-4">Progress · side by side</h3>
        <div className="grid grid-cols-2 gap-6">
          <ProgressColumn name="You" myStats={myStats} certCount={myCerts} activeCount={myActive} />
          <ProgressColumn name={them.name ?? them.email.split("@")[0]} myStats={theirStats} certCount={theirCerts} activeCount={theirActive} />
        </div>
      </Card>

      {/* Their recent activity */}
      {theirActivity.length > 0 && (
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">{them.name ?? "Buddy"}&apos;s recent activity</h3>
          <ul className="space-y-2">
            {theirActivity.map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <Calendar size={14} className="text-subtle shrink-0" />
                <span className="flex-1 truncate text-fg">{e.course.title}</span>
                <Badge tone={e.status === "completed" ? "success" : "neutral"}>{e.status}</Badge>
                <span className="text-xs text-subtle tabular-nums">{Math.round(e.progress)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Messages */}
      <BuddyChat pairId={pair.id} mePartnerName={them.name ?? them.email.split("@")[0]} myUserId={me} />
    </div>
  );
}

function ProgressColumn({ name, myStats, certCount, activeCount }: {
  name: string;
  myStats: { progress: number; status: string; score: number | null } | null;
  certCount: number;
  activeCount: number;
}) {
  return (
    <div>
      <p className="font-semibold text-fg mb-3">{name}</p>
      {myStats && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span className="capitalize">{myStats.status}</span>
            <span className="font-semibold text-fg">{myStats.progress}%</span>
          </div>
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all"
              style={{ width: `${myStats.progress}%` }}
            />
          </div>
          {myStats.score != null && (
            <p className="text-xs text-subtle mt-1">Last score: {Math.round(myStats.score)}%</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-elevated rounded-lg p-3">
          <p className="text-xs text-subtle">Certificates</p>
          <p className="text-lg font-bold text-fg">{certCount}</p>
        </div>
        <div className="bg-elevated rounded-lg p-3">
          <p className="text-xs text-subtle">In progress</p>
          <p className="text-lg font-bold text-fg">{activeCount}</p>
        </div>
      </div>
    </div>
  );
}
