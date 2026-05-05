import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Coins, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function CreditsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    }),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        // include course title if transaction is course-related
      },
    }),
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
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My BHN Credits</h1>
        <p className="text-gray-500 text-sm mt-1">Credits are used to enroll in paid courses.</p>
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

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tx.type === "credit" ? (
                    <ArrowUpCircle size={18} className="text-green-500 shrink-0" />
                  ) : (
                    <ArrowDownCircle size={18} className="text-red-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {reasonLabel[tx.reason] ?? tx.reason}
                    </p>
                    {tx.courseId && courseTitles[tx.courseId] && (
                      <p className="text-xs text-gray-400">{courseTitles[tx.courseId]}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-semibold text-sm",
                    tx.type === "credit" ? "text-green-600" : "text-red-500"
                  )}>
                    {tx.type === "credit" ? "+" : ""}{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Balance: {tx.balanceAfter.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
