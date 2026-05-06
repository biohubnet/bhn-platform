import { requireSession, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Coins, ArrowUpCircle, ArrowDownCircle, FileText, ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export default async function CreditsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";
  const showApplication = !isStaff(role); // trainees + evaluating only

  const [user, transactions, latestApp] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    showApplication
      ? prisma.creditApplication.findFirst({
          where: { userId },
          orderBy: { submittedAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const courseTitles: Record<string, string> = {};
  const courseIds = transactions.map((t) => t.courseId).filter(Boolean) as string[];
  if (courseIds.length > 0) {
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    });
    for (const c of courses) courseTitles[c.id] = c.title;
  }

  const balance = user?.credits ?? 0;

  const reasonLabel: Record<string, string> = {
    enrollment: "Course Enrollment",
    refund: "Refund",
    admin_grant: "Admin Credit Grant",
    initial: "Welcome Credits",
    application_approved: "Application Approved",
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-fg">My BHN Credits</h1>
        <p className="text-muted text-sm mt-1">Credits are used to enroll in paid courses.</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Coins size={28} />
          <p className="text-amber-100 font-medium">Available Balance</p>
        </div>
        <p className="text-5xl font-bold tracking-tight">{balance.toLocaleString()}</p>
        <p className="text-amber-100 mt-1">BHN Credits</p>
      </div>

      {/* Application status / CTA — trainees only */}
      {showApplication && (
        <ApplicationStatusCard latestApp={latestApp} />
      )}

      {/* Transaction history */}
      <div className="bg-card rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-semibold text-fg">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-subtle">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tx.type === "credit" ? (
                    <ArrowUpCircle size={18} className="text-emerald-500 shrink-0" />
                  ) : (
                    <ArrowDownCircle size={18} className="text-rose-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {reasonLabel[tx.reason] ?? tx.reason}
                    </p>
                    {tx.courseId && courseTitles[tx.courseId] && (
                      <p className="text-xs text-subtle">{courseTitles[tx.courseId]}</p>
                    )}
                    <p className="text-xs text-subtle">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-semibold text-sm",
                    tx.type === "credit" ? "text-emerald-600" : "text-rose-500"
                  )}>
                    {tx.type === "credit" ? "+" : ""}{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-subtle">Balance: {tx.balanceAfter.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AppRow {
  id: string;
  status: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewerNote: string | null;
  approvedAmount: number | null;
}

function ApplicationStatusCard({ latestApp }: { latestApp: AppRow | null }) {
  if (!latestApp) {
    return (
      <div className="bg-gradient-to-br from-brand-50 to-brand-100/40 border-2 border-brand-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-fg">Apply for additional 4,800 credits</p>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Submit a short application with supporting documents. An admin will review and credit
              your account if approved. Most reviews complete within a few business days.
            </p>
          </div>
        </div>
        <Link
          href="/credits/apply"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-brand-600/25 transition-all hover:-translate-y-0.5"
        >
          Start application <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const status = latestApp.status;
  const submitted = new Date(latestApp.submittedAt).toLocaleDateString();

  if (status === "pending") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Clock size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-amber-900">Application under review</p>
            <Badge tone="amber">Pending</Badge>
          </div>
          <p className="text-sm text-amber-800">
            Submitted {submitted}. We&apos;ll notify you when an admin completes the review.
          </p>
        </div>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <CheckCircle2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-emerald-900">Application approved</p>
            <Badge tone="success">+{(latestApp.approvedAmount ?? 0).toLocaleString()} credits</Badge>
          </div>
          <p className="text-sm text-emerald-800">
            Credits added to your balance. Ready to enroll in your next course.
          </p>
        </div>
      </div>
    );
  }

  // rejected
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
          <XCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-rose-900">Application not approved</p>
            <Badge tone="danger">Rejected</Badge>
          </div>
          <p className="text-sm text-rose-800">Reviewed on {latestApp.reviewedAt ? new Date(latestApp.reviewedAt).toLocaleDateString() : "—"}.</p>
          {latestApp.reviewerNote && (
            <p className="text-sm text-rose-800 bg-card border border-rose-100 rounded-lg p-3 mt-2 leading-relaxed">
              <span className="block text-xs font-semibold text-rose-700 mb-1 uppercase tracking-wider">Reviewer note</span>
              {latestApp.reviewerNote}
            </p>
          )}
        </div>
      </div>
      <Link
        href="/credits/apply"
        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-rose-700 hover:text-rose-900"
      >
        Submit a new application <ArrowRight size={14} />
      </Link>
    </div>
  );
}
