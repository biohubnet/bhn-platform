/**
 * /committee/hqp/apply — applicant-facing open-call form.
 *
 * Page shape:
 *   • If there's no active window         → "No open call right now" copy
 *   • If active window + no draft          → render the form
 *   • If active window + existing draft    → render the form pre-filled
 *   • If existing submitted/approved/rejected app for the user
 *     against the active window            → read-only status panel
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentOpenWindow } from "@/lib/hqp/windows";
import { PageHeader } from "@/components/ui/PageHeader";
import { HqpApplicationForm } from "@/components/committee/HqpApplicationForm";
import type { HqpApplicationFormData } from "@/lib/hqp/types";

export const dynamic = "force-dynamic";

export default async function HqpApplyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const window = await currentOpenWindow();

  if (!window) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <Link href="/committee/hqp" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
          <ArrowLeft size={12} /> HQP committee
        </Link>
        <PageHeader
          title="HQP Advisory Committee — Apply"
          description="The committee shapes BHN's programs, platform, and events. Membership is 1 year, ~12 h total."
        />
        <section className="rounded-2xl border border-line bg-card p-12 text-center surface-shadow">
          <CalendarClock size={28} className="text-subtle mx-auto mb-3" />
          <p className="text-fg font-bold">No open call right now</p>
          <p className="text-muted text-sm mt-1 max-w-prose mx-auto">
            The committee runs an annual open call. Watch the BHN newsletter + dashboard announcements; the next window will be posted ~6 weeks before the cycle starts.
          </p>
        </section>
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, organization: true },
  });

  const existing = await prisma.hqpMemberApplication.findUnique({
    where: { userId_windowId: { userId, windowId: window.id } },
  });

  const initial = (existing?.formData as HqpApplicationFormData) ?? {};
  const readOnly = existing && existing.status !== "draft"
    ? (existing.status as "submitted" | "approved" | "rejected")
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Link href="/committee/hqp" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> HQP committee
      </Link>

      <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 surface-shadow">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-700">Current open call</p>
        <p className="text-sm font-bold text-fg mt-1">{window.title} · {window.year}</p>
        <p className="text-[11px] text-muted mt-0.5">
          Closes {window.closesAt.toLocaleString("en-US", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" })}
        </p>
        {window.description && <p className="text-[12px] text-fg/90 mt-2 leading-snug">{window.description}</p>}
      </section>

      <HqpApplicationForm
        initial={initial}
        profile={{ name: user?.name ?? "", email: user?.email ?? "", organization: user?.organization ?? null }}
        readOnlyStatus={readOnly}
        reviewerNote={existing?.reviewerNote ?? null}
      />
    </div>
  );
}
