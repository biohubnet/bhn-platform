/**
 * CreditUsageScoreboard — anonymised top-10 leaderboard of trainees
 * by lifetime credits spent on coursework. Rendered on the trainee
 * dashboard to celebrate engagement and gently nudge progress.
 *
 * Privacy rules:
 *   • Only `accountKind: "real"` trainees / evaluating users are
 *     counted — demo, sandbox, and admin accounts are excluded so
 *     the board reflects authentic engagement.
 *   • Names are masked to "FirstName L." (full first name + last-
 *     name initial). The current user, when they're on the board,
 *     sees their own row labelled "YOU" with their real name.
 *   • Users with no last name fall back to just first name; users
 *     missing both names fall back to "Trainee #{rank}".
 *
 * Server component — queries Prisma on render. Auto-hides when no
 * trainees have any debit activity yet (clean install / dev mode).
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
  if (!last || last === first) return first; // single name → return as-is
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

interface Props {
  userId: string;
}

export async function CreditUsageScoreboard({ userId }: Props) {
  // Aggregate debit totals per user, filtered to real-account
  // trainees / evaluating users only. Prisma's groupBy supports a
  // relation filter via the `user` field so the SQL stays a single
  // round-trip.
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

  // Hydrate the leaderboard rows with names. Single IN query is
  // cheaper than N findUnique calls.
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

  // If the current user isn't on the board, fetch their own rank
  // so they can see "you're at #N" — keeps the surface motivating
  // even for newcomers.
  const youOnBoard = rows.some((r) => r.isMe);
  let youOff: { rank: number; total: number } | null = null;
  if (!youOnBoard) {
    const mine = await prisma.creditTransaction.aggregate({
      where: { userId, type: "debit" },
      _sum: { amount: true },
    });
    const myTotal = Math.abs(mine._sum.amount ?? 0);
    if (myTotal > 0) {
      // Rank by counting trainees ahead — a single COUNT query.
      // Note: groupBy doesn't support filtering by aggregate value
      // server-side, so we count distinct users with sum(amount) >
      // myTotal via a raw query.
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
    <section className="rounded-3xl bg-card border border-line surface-shadow p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 inline-flex items-center justify-center">
            <Trophy size={16} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] font-black text-amber-700">
              Credits trained
            </p>
            <h2 className="text-base font-bold text-fg tracking-tight">Top trainees this season</h2>
          </div>
        </div>
        <span className="text-[10px] text-subtle">Names masked · real accounts only</span>
      </header>

      <ol className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.rank}
            className={
              "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm " +
              (r.isMe
                ? "bg-brand-50 ring-1 ring-brand-200"
                : "hover:bg-elevated transition-colors")
            }
          >
            <span
              className={
                "shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-black " +
                (r.rank === 1
                  ? "bg-amber-300 text-amber-900"
                  : r.rank === 2
                    ? "bg-slate-200 text-slate-800"
                    : r.rank === 3
                      ? "bg-orange-200 text-orange-900"
                      : "bg-elevated text-muted")
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
        <p className="mt-4 text-xs text-muted leading-snug inline-flex items-center gap-2">
          <Flame size={12} className="text-amber-500" />
          You&apos;re at <span className="font-bold text-fg">#{youOff.rank}</span> with{" "}
          <span className="font-mono font-bold text-fg">{youOff.total.toLocaleString()}</span> credits.
          Keep training to climb.
        </p>
      )}
    </section>
  );
}
