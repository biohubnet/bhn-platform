import Link from "next/link";
import {
  Sparkles, Users2, Search, Building2, Calendar, ShieldCheck, ArrowRight,
  GraduationCap, Activity, BookOpen,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LogoMark } from "@/components/ui/Logo";
import { AccessRequestForm } from "@/components/marketing/AccessRequestForm";

export const dynamic = "force-dynamic";

export default async function ForEmployersPage() {
  // Tasteful, anonymised pulse stats — no PII.
  const [traineeCount, courseCount, postingCount, skillCount] = await Promise.all([
    prisma.user.count({ where: { isActive: true, role: { in: ["trainee", "evaluating"] } } }).catch(() => 0),
    prisma.course.count({ where: { status: "published" } }).catch(() => 0),
    prisma.internshipPosting.count({ where: { status: "active" } }).catch(() => 0),
    prisma.skill.count({ where: { status: "active" } }).catch(() => 0),
  ]);

  return (
    <div className="min-h-screen has-grain bg-page">
      {/* Top nav */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size={32} />
          <div className="leading-tight">
            <p className="font-bold text-fg text-sm">BHN <span className="text-brand-600">Training</span></p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-subtle">For employers</p>
          </div>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/for-trainees" className="text-muted hover:text-fg">For trainees</Link>
          <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">Sign in →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="full-bleed relative overflow-hidden text-white -mt-2 hero-mesh-brand">
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob-shape blob-soft drift" style={{ width: 540, height: 540, top: -180, left: -160 }} />
          <div className="blob-shape blob-soft drift-slow" style={{ width: 660, height: 660, bottom: -260, right: -180, opacity: 0.55 }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 inline-flex items-center gap-2">
            <Building2 size={12} /> BHN Training · Industry partners
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mt-3 max-w-3xl">
            Hire the people who <span className="gradient-text">already trained</span> for the job.
          </h1>
          <p className="mt-6 text-white/90 leading-relaxed max-w-2xl text-lg">
            Post a role, and we surface BHN trainees whose course completions and verified skills line up with what you need — scored, ranked, evidenced. Less résumé screening. More conversations.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="#request"
              className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm px-6 py-3 organic-card shadow-lg shadow-brand-900/30 transition-all hover:-translate-y-0.5"
            >
              Request access <ArrowRight size={14} />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/25 text-white hover:bg-white/20 text-sm font-semibold px-6 py-3 organic-card-alt"
            >
              How it works
            </Link>
          </div>

          {/* Pulse stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
            <Pulse label="Active trainees" value={traineeCount} />
            <Pulse label="Published courses" value={courseCount} />
            <Pulse label="Live postings" value={postingCount} />
            <Pulse label="Tracked skills" value={skillCount} />
          </div>
        </div>
        <div className="curve-down" />
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">From posting to interview in days, not weeks</p>
          <h2 className="text-3xl md:text-4xl font-bold text-fg mt-2">How it works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Step
            icon={Sparkles}
            n={1}
            title="Post a role — see matches as you type"
            body="Drop the position description. We extract the underlying skills and surface BHN trainees whose verified profiles overlap. You get a feel for the market before the role even goes live."
          />
          <Step
            icon={Users2}
            n={2}
            title="Score, screen, shortlist"
            body="Each applicant gets a match score, a breakdown of which required skills they bring, and links to the BHN courses that taught them. Drag through a kanban from New to Offer."
          />
          <Step
            icon={Calendar}
            n={3}
            title="Schedule with one click"
            body="Propose 1–5 time slots, format (video / phone / onsite), and a short note. The applicant accepts from their dashboard. No external calendar app required."
          />
        </div>
      </section>

      {/* Why we're different */}
      <section className="bg-elevated/30 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">Why partners choose BHN</p>
              <h2 className="text-3xl md:text-4xl font-bold text-fg mt-2 leading-tight">
                Skills you can actually verify.
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                Every skill on a candidate&apos;s profile is backed by something tangible — a completed BHN course with a passing score, a parsed line from their resume, or a self-claim they can back up. No AI black-box scoring you can&apos;t trust.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-fg">
                <Bullet icon={GraduationCap} text="Verified course completions with certificates and scores" />
                <Bullet icon={Activity}      text="Live skill graph — adds new keywords as the catalog grows" />
                <Bullet icon={BookOpen}      text="Trainees see exactly which skills your role requires — and which courses unlock them" />
                <Bullet icon={ShieldCheck}   text="Privacy first: trainees see initials only until they apply" />
              </ul>
            </div>
            <div className="bg-card border border-line rounded-2xl p-6 shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-3">Sample candidate match</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm flex items-center justify-center font-bold">AC</div>
                <div className="flex-1">
                  <p className="font-semibold text-fg leading-tight">A.C. — Toronto, ON</p>
                  <p className="text-xs text-muted">Bioprocess Development Intern · 4 BHN courses completed</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">87</p>
                  <p className="text-[9px] uppercase tracking-wider text-subtle">match</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Cell Culture", "Aseptic Technique", "GMP", "HPLC", "Python"].map((s) => (
                  <span key={s} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">{s}</span>
                ))}
              </div>
              <p className="text-xs text-muted">Missing: <span className="text-rose-700 font-medium">Bioreactor Operation</span> · suggested course in BHN catalog</p>
            </div>
          </div>
        </div>
      </section>

      {/* Request access form */}
      <section id="request" className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">Get started</p>
          <h2 className="text-3xl md:text-4xl font-bold text-fg mt-2">Request employer access</h2>
          <p className="mt-3 text-muted leading-relaxed max-w-xl mx-auto">
            BHN Training is invite-only for industry partners. Tell us a bit about your team and we&apos;ll send your invite link within one business day.
          </p>
        </div>
        <AccessRequestForm kind="employer" />
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-line text-center text-xs text-subtle">
        © {new Date().getFullYear()} BioHubNet · <Link href="/privacy" className="hover:text-fg">Privacy</Link> · <Link href="/terms" className="hover:text-fg">Terms</Link>
      </footer>
    </div>
  );
}

function Pulse({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3">
      <p className="text-3xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/75 mt-1">{label}</p>
    </div>
  );
}

function Step({
  n, icon: Icon, title, body,
}: {
  n: number;
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-card border border-line rounded-2xl p-6 hover:border-brand-200 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold">Step {n}</span>
      </div>
      <h3 className="font-semibold text-fg leading-tight mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Bullet({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={11} />
      </span>
      <span>{text}</span>
    </li>
  );
}
