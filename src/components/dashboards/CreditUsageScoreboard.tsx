/**
 * CreditUsageScoreboard — anonymised top-10 leaderboard of trainees
 * by lifetime credits spent on coursework.
 *
 * Renders flat (no outer rounded box) — its host section provides
 * the gradient wash. Just header + divide-y row list, sits cleanly
 * inside a line-and-gradient layout.
 *
 * Privacy rules:
 *   • Only `accountKind: "real"` trainees / evaluating users are
 *     counted — demo, sandbox, and admin accounts are excluded so
 *     the board reflects authentic engagement.
 *   • Names are masked to "FirstName L." The current user, when
 *     they're on the board, sees their own row labelled "YOU" with
 *     their real name.
 *   • Users with no last name fall back to just first name; users
 *     missing both names fall back to "Trainee #{rank}".
 *
 * Server component. Auto-hides when no trainees have debit activity.
 */
import { prisma } from "@/lib/prisma";
import { Trophy, Flame } from "lucide-react";

const TRAINEE_ROLES = ["trainee", "evaluating"];
const BOARD_SIZE = 10;

function maskName(fullName: string | null, rank: number): string {
  if (!fullName?.trim()) return `Trainee #${rank}`;
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!last || last === first) return first;
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

interface Props {
  userId: string;
}

export async function CreditUsageScoreboard({ userId }: Props) {
  const groups = await prisma.creditTransaction.groupBy({
    by: ["userId"],
    where: {
      type: "debit",
      user: {
        is: {
          accountKind: "real",
          role: { in: TRAINEE_ROLES },
        },
      },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: BOARD_SIZE,
  });

  if (groups.length === 0) return null;

  const userIds = groups.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const rows = groups.map((g, idx) => {
    const rank = idx + 1;
    const isMe = g.userId === userId;
    const realName = nameById.get(g.userId) ?? null;
    return {
      rank,
      isMe,
      label: isMe ? (realName ?? "You") : maskName(realName, rank),
      total: Math.abs(g._sum.amount ?? 0),
    };
  });

  const youOnBoard = rows.some((r) => r.isMe);
  let youOff: { rank: number; total: number } | null = null;
  if (!youOnBoard) {
    const mine = await prisma.creditTransaction.aggregate({
      where: { userId, type: "debit" },
      _sum: { amount: true },
    });
    const myTotal = Math.abs(mine._sum.amount ?? 0);
    if (myTotal > 0) {
      const aheadRows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT "userId", SUM(ABS("amount")) AS total
          FROM "CreditTransaction" ct
          JOIN "User" u ON u.id = ct."userId"
          WHERE ct."type" = 'debit'
            AND u."accountKind" = 'real'
            AND u."role" IN ('trainee','evaluating')
          GROUP BY "userId"
          HAVING SUM(ABS("amount")) > ${myTotal}
        ) sub
      `;
      const ahead = Number(aheadRows[0]?.count ?? 0);
      youOff = { rank: ahead + 1, total: myTotal };
    }
  }

  return (
    <section>
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-2">
          <Trophy size={14} className="text-amber-600" />
          <p className="text-[10px] uppercase tracking-[0.22em] font-black text-amber-700">
            Top trainees this season
          </p>
        </div>
        <span className="text-[10px] text-fg-subtle">Real accounts · names masked</span>
      </header>

      <ol className="divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <li
            key={r.rank}
            className={
              "flex items-center gap-3 py-2.5 text-sm " +
              (r.isMe ? "bg-brand-50/40" : "")
            }
          >
            <span
              className={
                "shrink-0 w-6 text-center font-black tabular-nums " +
                (r.rank === 1
                  ? "text-amber-600"
                  : r.rank === 2
                    ? "text-slate-500"
                    : r.rank === 3
                      ? "text-orange-700"
                      : "text-fg-subtle")
              }
            >
              {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank - 1] : r.rank}
            </span>
            <span className={"flex-1 truncate " + (r.isMe ? "font-bold text-brand-800" : "text-fg")}>
              {r.label}
              {r.isMe && (
                <span className="ml-2 inline-flex items-center text-[9px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full bg-brand-600 text-white">
                  You
                </span>
              )}
            </span>
            <span className="font-mono tabular-nums font-bold text-fg text-sm">
              {r.total.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>

      {youOff && (
        <p className="mt-3 text-xs text-fg-muted inline-flex items-center gap-2">
          <Flame size={12} className="text-amber-500" />
          You&apos;re at <span className="font-bold text-fg">#{youOff.rank}</span> with{" "}
          <span className="font-mono font-bold text-fg">{youOff.total.toLocaleString()}</span> credits.
          Keep training to climb.
        </p>
      )}
    </section>
  );
}
