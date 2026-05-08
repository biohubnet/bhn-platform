/**
 * First-run welcome for newly-claimed employer accounts. Renders only
 * when the employer has no postings AND their company profile is
 * mostly empty — those are the strongest signals that they just
 * landed via the magic link.
 *
 * Each step has a checkbox cue (filled if we can detect it's done).
 * Server-rendered — no client state needed.
 */
import Link from "next/link";
import { ArrowRight, Building2, FilePlus, Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  firstName: string | null;
  companyName: string | null;
}

export function EmployerWelcome({ firstName, companyName }: Props) {
  return (
    <section className="my-6 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-card p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-brand-700">
            Welcome to BHN Training
          </p>
          <h2 className="text-xl font-bold text-fg leading-tight mt-0.5">
            {firstName
              ? `Glad you're here, ${firstName}.`
              : "Glad you're here."}
            {companyName && ` Let's set up ${companyName}.`}
          </h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            Three quick steps and you&apos;ll be hiring through BHN. Each opens its own page — come back here when you&apos;re ready for the next.
          </p>
        </div>
      </div>

      <ol className="space-y-2.5">
        <Step
          n={1}
          done={false}
          icon={Building2}
          title="Fill in your company profile"
          body="A 30-second AI fill-in from your company website covers most of it. Logo, industry, size, location, founding year, short description."
          href="/employer/profile"
          cta="Open company profile"
        />
        <Step
          n={2}
          done={false}
          icon={FilePlus}
          title="Post your first internship"
          body="Drop a job description (PDF, DOCX, or paste text) and the AI extracts the fields. Or fill in manually. Position goes live the moment you save."
          href="/admin/internships/new"
          cta="Create posting"
        />
        <Step
          n={3}
          done={false}
          icon={Sparkles}
          title="Review applicants & schedule interviews"
          body="Each posting has its own kanban — drag candidates from New through to Offer. Click Schedule on a card to propose 1–5 time slots; the candidate accepts from their dashboard."
          href="/employer/applicants"
          cta="Browse the talent pool"
        />
      </ol>
    </section>
  );
}

function Step({
  n, done, icon: Icon, title, body, href, cta,
}: {
  n: number;
  done: boolean;
  icon: React.ElementType;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <li className="bg-card-solid border border-line rounded-xl p-4 flex items-start gap-3 hover:border-brand-300 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        {done ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Icon size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-subtle">Step {n}</span>
          {done && <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">done</span>}
        </div>
        <h3 className="text-sm font-semibold text-fg mt-0.5">{title}</h3>
        <p className="text-xs text-muted leading-relaxed mt-1">{body}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 shrink-0"
      >
        {cta} <ArrowRight size={11} />
      </Link>
    </li>
  );
}

