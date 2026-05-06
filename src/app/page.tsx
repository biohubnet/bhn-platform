import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  GraduationCap, Award, Layers, ShieldCheck, BarChart3, Coins,
  ArrowRight, Sparkles, BookOpen,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const [coursesCount, pathwaysCount, learnersCount, certificatesCount] = await Promise.all([
    prisma.course.count({ where: { status: "published" } }),
    prisma.pathway.count({ where: { status: "published" } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.certificate.count({ where: { revokedAt: null } }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-600/20">B</div>
            <span className="font-semibold text-slate-900">BHN Training</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pathways" className="hover:text-slate-900">Pathways</a>
            <a href="#trust" className="hover:text-slate-900">Trust</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5">Sign in</Link>
            <Link href="/register" className="text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-sm shadow-brand-600/20 transition-colors">Get started</Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full">
              <Sparkles size={12} /> SCORM-compliant LMS for biomanufacturing
            </span>
            <h1 className="mt-5 text-5xl font-bold text-slate-900 tracking-tight leading-tight">
              Train smarter.<br /><span className="text-brand-600">Stay compliant.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
              BHN Training Platform delivers role-based learning paths, automated certification,
              and audit-ready reporting — built for cleanroom-grade quality.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-md shadow-brand-600/25 transition-all hover:-translate-y-0.5">
                Start free <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-brand-700 px-4 py-3">Sign in →</Link>
            </div>
            <div className="mt-12 grid grid-cols-4 gap-6 max-w-xl">
              {[
                { value: coursesCount, label: "Courses" },
                { value: pathwaysCount, label: "Pathways" },
                { value: learnersCount, label: "Learners" },
                { value: certificatesCount, label: "Certified" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-8 -right-8 w-72 h-72 bg-brand-200 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-brand-100 rounded-full blur-3xl opacity-50" />
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-brand-900/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center"><ShieldCheck size={14} /></div>
                  <span className="text-xs font-medium text-slate-700">Aseptic Technique 101</span>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Passed</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Score</p><p className="text-lg font-bold text-slate-900">94%</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Time</p><p className="text-lg font-bold text-slate-900">22m</p></div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <Award size={14} className="text-amber-500" /> Certificate issued automatically
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Everything your training program needs</h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">From SCORM uploads to compliance reporting, BHN replaces the patchwork of tools biomanufacturing teams cobble together today.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: BookOpen, title: "SCORM 1.2 / 2004", desc: "Drop in any SCORM zip. We extract, host, and play it back with full bookmarking." },
            { icon: Layers, title: "Training Pathways", desc: "Bundle courses into role-based curricula. Auto-issue a pathway certificate when complete." },
            { icon: Award, title: "Certification", desc: "Branded PDF certificates with expiry, revocation, and a public verification page." },
            { icon: BarChart3, title: "Compliance Reports", desc: "Per-course completion, due dates, and at-a-glance overdue tracking. CSV export anytime." },
            { icon: Coins, title: "BHN Credits", desc: "Manage paid courses with an internal credit economy. Grant, refund, audit." },
            { icon: ShieldCheck, title: "Audit Trail", desc: "Every admin action logged. Tamper-evident, GMP-aligned, ready for your next inspection." },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-brand-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-4"><Icon size={18} /></div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="pathways" className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 rounded-3xl px-10 py-16 text-white shadow-2xl shadow-brand-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-300/10 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-brand-200">Training Pathways</span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">One certificate for an entire role</h2>
              <p className="mt-4 text-brand-100 leading-relaxed">Pathways group multiple courses into a single learning journey. When learners complete every required course, BHN automatically issues a pathway-level certificate with the right expiry and metadata.</p>
              <Link href="/register" className="inline-flex items-center gap-2 mt-6 bg-white text-brand-700 hover:bg-brand-50 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors">Try it free <ArrowRight size={16} /></Link>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 space-y-3">
              {[
                { name: "Aseptic Technique 101", status: "done" },
                { name: "Cleanroom Behavior", status: "done" },
                { name: "Gowning Qualification", status: "current" },
                { name: "Final Pathway Exam", status: "locked" },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                  <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold " + (c.status === "done" ? "bg-emerald-400 text-emerald-950" : c.status === "current" ? "bg-amber-300 text-amber-950 animate-pulse" : "bg-white/15 text-white/50")}>
                    {c.status === "done" ? "✓" : i + 1}
                  </div>
                  <span className={"text-sm " + (c.status === "locked" ? "text-white/40" : "text-white")}>{c.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 pt-2 text-xs text-brand-100 border-t border-white/10"><Award size={14} /> Pathway certificate at 4/4</div>
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: ShieldCheck, title: "GMP-aligned", desc: "21 CFR Part 11 audit log, electronic signatures roadmap." },
            { icon: GraduationCap, title: "Built for L&D", desc: "Designed with quality and training leads, not generic SaaS." },
            { icon: BarChart3, title: "Always exportable", desc: "Your data stays yours — full CSV export and SCORM portability." },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title}>
                <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3"><Icon size={22} /></div>
                <h3 className="font-semibold text-slate-900">{t.title}</h3>
                <p className="text-sm text-slate-500 mt-1.5">{t.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ready to roll your training out?</h2>
        <p className="mt-3 text-slate-600">Sign up free and upload your first SCORM course in under five minutes.</p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-3 rounded-lg shadow-md shadow-brand-600/25 transition-all hover:-translate-y-0.5">Create your account <ArrowRight size={16} /></Link>
          <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-brand-700 px-4 py-3">Sign in</Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BHN Training Platform</p>
          <p>Built with care for the bioprocess community.</p>
        </div>
      </footer>
    </div>
  );
}
