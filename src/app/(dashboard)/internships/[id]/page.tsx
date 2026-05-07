import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase, MapPin, Clock, Calendar, DollarSign, ExternalLink, ArrowLeft,
  Pencil, Globe,
} from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";

export default async function InternshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  const p = await prisma.internshipPosting.findUnique({ where: { id } });
  if (!p) notFound();
  if (!isStaff && p.status !== "active") notFound();

  const fmtUrl = p.website
    ? p.website.startsWith("http")
      ? p.website
      : `https://${p.website}`
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/internships"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft size={12} /> All postings
      </Link>

      <article className="bg-card border border-line rounded-2xl overflow-hidden">
        {/* Header band */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-line bg-elevated/40">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-subtle">
                {p.companyName}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-fg leading-tight mt-1.5">
                {p.title}
              </h1>
              {fmtUrl && (
                <a
                  href={fmtUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm text-brand-700 hover:underline"
                >
                  <Globe size={13} /> {p.website?.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {p.status === "draft" && <Badge tone="warning">Draft</Badge>}
              {p.status === "closed" && <Badge tone="neutral">Closed</Badge>}
              {isStaff && (
                <Link
                  href={`/admin/internships/${p.id}/edit`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 inline-flex items-center gap-1.5 font-medium"
                >
                  <Pencil size={13} /> Edit
                </Link>
              )}
            </div>
          </div>

          {/* Quick facts row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Fact icon={MapPin}      label="Location"     value={p.location} />
            <Fact icon={Briefcase}   label="Type"         value={p.type} />
            <Fact icon={Clock}       label="Duration"     value={p.duration} />
            <Fact icon={DollarSign}  label="Compensation" value={p.compensation} />
            <Fact icon={Clock}       label="Hours"        value={p.hours} />
            <Fact
              icon={Calendar}
              label="Application deadline"
              value={p.deadline ? p.deadline.toLocaleDateString() : null}
            />
          </div>
        </div>

        {/* Skills */}
        {p.keySkills.length > 0 && (
          <div className="px-6 sm:px-8 py-5 border-b border-line">
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-2">Key skills</p>
            <div className="flex flex-wrap gap-2">
              {p.keySkills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Position details */}
        <div className="px-6 sm:px-8 py-6">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-3">Position details</p>
          <div className="prose prose-sm max-w-none text-fg whitespace-pre-line leading-relaxed">
            {p.positionDetails}
          </div>

          {fmtUrl && (
            <div className="mt-8 pt-6 border-t border-line">
              <a
                href={fmtUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-3 rounded-lg shadow-md transition-colors"
              >
                Apply on company site <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function Fact({
  icon: Icon, label, value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-card-solid border border-line text-brand-600 flex items-center justify-center shrink-0">
        <Icon size={13} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-subtle">{label}</p>
        <p className="text-sm font-medium text-fg break-words">{value}</p>
      </div>
    </div>
  );
}
