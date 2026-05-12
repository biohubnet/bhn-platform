import { notFound } from "next/navigation";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSeedForm } from "@/lib/forms/registry";
import type { FormField } from "@/lib/forms/types";
import { EventFormView } from "@/components/forms/EventFormView";
import { ObioBootcampInfo } from "@/components/forms/content/ObioBootcampInfo";

/**
 * Per-slug marketing/info content rendered ABOVE the registration form.
 * Mirrors the structure of the public marketing pages on biohubnet.ca
 * (the BHN team's other property) but rebuilt in the platform's design
 * language so it picks up theme tokens automatically. Add new entries
 * here as we build more event-specific landing pages.
 */
const SLUG_CONTENT: Record<string, React.ComponentType> = {
  "obio-bootcamp": ObioBootcampInfo,
};

/**
 * Talent application + other event forms.
 *
 * Pre-fill order (precedence: a real prior submission wins, so an
 * explicit edit a trainee made on the form survives a later My-
 * Application change):
 *   1. The trainee's "My Application" artifacts on the User row
 *      (resumeUrl → field "resume", videoIntroUrl → "video",
 *      elevatorPitch → "pitch"). Only seeded for the talent-application
 *      slug today; the field-id mapping lives below.
 *   2. The trainee's most-recent submission of THIS form, which
 *      overrides any My-Application defaults for the same fields.
 *
 * Empty strings / empty arrays in the previous submission don't
 * clobber a non-empty My-Application default — the goal is "carry
 * forward what you typed", not "wipe with blanks".
 *
 * The merged result is passed as `previousData` so EventFormView keeps
 * its single source-of-truth for initial values. We also pass an
 * `applicationDefaultsApplied` flag so the form can show a banner
 * when fields came from My Application rather than a real prior
 * submission (different mental model — "we filled this for you" vs
 * "you submitted this before").
 */

// Field-id mapping for forms that should pre-fill from My Application.
// Key: form slug. Value: { userField → formFieldId }.
const APPLICATION_PREFILL_MAP: Record<
  string,
  Record<"resumeUrl" | "videoIntroUrl" | "elevatorPitch", string>
> = {
  "talent-application": {
    resumeUrl:     "resume",
    videoIntroUrl: "video",
    elevatorPitch: "pitch",
  },
};

export default async function FormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  const userEmail = (session!.user as { email?: string }).email ?? null;
  const isStaff = checkIsStaff(role);

  const form = await getOrSeedForm(slug);
  if (!form) notFound();

  const prefillMap = APPLICATION_PREFILL_MAP[slug];

  const [mySubmission, userArtifacts] = await Promise.all([
    userId
      ? prisma.eventFormSubmission.findFirst({
          where: { formId: form.id, userId },
          orderBy: { createdAt: "desc" },
        })
      : null,
    userId && prefillMap
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { resumeUrl: true, videoIntroUrl: true, elevatorPitch: true },
        })
      : null,
  ]);

  // Build the merged defaults. My-Application first, prior submission
  // overrides for fields it actually filled.
  const merged: Record<string, string | string[]> = {};
  const fromApplication: Record<string, string> = {};
  if (userArtifacts && prefillMap) {
    if (userArtifacts.resumeUrl) fromApplication[prefillMap.resumeUrl] = userArtifacts.resumeUrl;
    if (userArtifacts.videoIntroUrl) fromApplication[prefillMap.videoIntroUrl] = userArtifacts.videoIntroUrl;
    if (userArtifacts.elevatorPitch) fromApplication[prefillMap.elevatorPitch] = userArtifacts.elevatorPitch;
  }
  for (const k in fromApplication) merged[k] = fromApplication[k];

  if (mySubmission?.data) {
    const prev = mySubmission.data as Record<string, string | string[]>;
    for (const k in prev) {
      const v = prev[k];
      if (v == null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      merged[k] = v;
    }
  }

  // Only flag "applied" if at least one of our application fields would
  // appear in the form *because of us* — i.e. the prior submission
  // didn't already supply that field. Otherwise the banner is noise.
  let applicationDefaultsApplied = false;
  if (Object.keys(fromApplication).length > 0) {
    const prev = (mySubmission?.data ?? {}) as Record<string, string | string[]>;
    applicationDefaultsApplied = Object.keys(fromApplication).some((id) => {
      const v = prev[id];
      return v == null
        || (typeof v === "string" && v.trim() === "")
        || (Array.isArray(v) && v.length === 0);
    });
  }

  const ExtraContent = SLUG_CONTENT[slug];

  // Per-applicant review-state banner — talent-application only. Shows
  // their most recent submission's state and the reviewer note (if any)
  // so they aren't left guessing about "will I be in the pool?"
  const myReviewState = slug === "talent-application" && mySubmission
    ? {
        status: (mySubmission as unknown as { reviewStatus: string }).reviewStatus,
        note: (mySubmission as unknown as { reviewerNote: string | null }).reviewerNote,
      }
    : null;

  return (
    <>
      {ExtraContent && <ExtraContent />}

      {slug === "talent-application" && (
        <div className="rounded-2xl bg-sky-50 ring-1 ring-inset ring-sky-200 px-4 py-3 mb-5 flex items-start gap-2">
          <span className="text-sky-600 text-sm mt-0.5">ⓘ</span>
          <div className="flex-1 text-sm text-sky-900 leading-snug">
            <p className="font-bold">New applications go through admin review.</p>
            <p className="text-xs mt-1">
              We review every new talent-pool submission before it becomes
              visible to vetted industry partners. You'll be notified by email
              when a decision is made; resubmitting before review just updates
              the same submission.
            </p>
            {myReviewState && (
              <p className="text-xs mt-2 font-semibold inline-flex items-center gap-1.5">
                Your status:
                <ReviewBadge status={myReviewState.status} />
                {myReviewState.note && (
                  <span className="font-normal italic">— "{myReviewState.note}"</span>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      <EventFormView
        slug={form.slug}
        title={form.title}
        description={form.description}
        fields={form.fields as unknown as FormField[]}
        active={form.active}
        isStaff={isStaff}
        userEmail={userEmail}
        previousData={Object.keys(merged).length > 0 ? merged : null}
        previousAt={mySubmission?.createdAt.toISOString() ?? null}
        applicationDefaultsApplied={applicationDefaultsApplied}
      />
    </>
  );
}

function ReviewBadge({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    pending:               { label: "Pending review",   cls: "bg-amber-100 text-amber-800 ring-amber-200" },
    approved:              { label: "Approved",         cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
    approved_skip_review:  { label: "Approved",         cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
    rejected:              { label: "Not approved",     cls: "bg-rose-100 text-rose-800 ring-rose-200" },
  };
  const m = meta[status] ?? meta.pending;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${m.cls}`}>
      {m.label}
    </span>
  );
}
