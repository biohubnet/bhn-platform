/**
 * Mock Interview practice — index. Start a new session (role + optional
 * focus), or revisit past sessions with their scores. Voice-or-type: the AI
 * asks questions, you answer aloud (Whisper transcribes) or by typing, and
 * each answer gets scored with feedback.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mic, ArrowRight, CheckCircle2, CircleDashed, Trash2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";
import { NewInterviewForm } from "@/components/interview/NewInterviewForm";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) => {
  try { return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
};

export default async function MockInterviewPage() {
  const session = await getSession();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect("/login");

  const interviews = await prisma.mockInterview.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, role: true, status: true, overallScore: true, createdAt: true,
      _count: { select: { answers: true } },
      answers: { where: { answeredAt: { not: null } }, select: { id: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <PageHero
        eyebrow={<><Mic size={11} /> Practice</>}
        title="Mock Interview"
        description="Practise interviews out loud. Pick a role, the AI asks tailored questions, and you answer by voice or by typing — each answer gets an honest score and specific feedback, ending with an overall debrief."
      />

      <NewInterviewForm />

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-subtle">Your past sessions</h2>
        {interviews.length === 0 ? (
          <Card className="px-5 py-10 text-center text-sm text-muted">
            No sessions yet — start one above. Your first practice run takes about 10 minutes.
          </Card>
        ) : (
          <ul className="space-y-2">
            {interviews.map((iv) => {
              const answered = iv.answers.length;
              const total = iv._count.answers;
              const complete = iv.status === "complete";
              return (
                <li key={iv.id}>
                  <Link
                    href={`/mock-interview/${iv.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-card-solid px-4 py-3 transition-colors hover:bg-elevated/40"
                  >
                    <span className={complete ? "text-emerald-600" : "text-amber-500"}>
                      {complete ? <CheckCircle2 size={18} /> : <CircleDashed size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-fg">{iv.role}</span>
                      <span className="block text-[11.5px] text-muted">
                        {fmtDate(iv.createdAt)} · {answered}/{total} answered · {complete ? "complete" : "in progress"}
                      </span>
                    </span>
                    {typeof iv.overallScore === "number" && complete && (
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 tabular-nums">
                        {iv.overallScore}/100
                      </span>
                    )}
                    <ArrowRight size={16} className="shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-subtle">
        <Trash2 size={11} /> Open a session to delete it. Recordings are transcribed and discarded — only the text is saved.
      </p>
    </div>
  );
}
