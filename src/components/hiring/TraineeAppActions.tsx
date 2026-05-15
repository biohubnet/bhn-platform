"use client";
/**
 * Trainee-side application actions.
 *
 *   • Pick an interview slot (when an interview is in `proposed` status)
 *   • Confirm + see the accepted slot (when accepted)
 *   • Read the offer + Accept / Decline (when an offer is `sent`)
 *   • Withdraw the application (any non-terminal stage)
 *
 * Every action POSTs to a dedicated route; router.refresh() reconciles
 * the page state after each call.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Calendar, Check, X, Loader2, Briefcase, AlertCircle, Trophy,
  Sparkles, ArrowRight,
} from "lucide-react";
// Pure metadata module — see comment in ApplicantActions.tsx for the
// "Module not found: 'tls'" backstory.
import type { Stage } from "@/lib/hiring/stages";

interface InterviewView {
  id: string;
  status: string;
  format: string | null;
  location: string | null;
  notes: string | null;
  proposedSlots: string[];
  acceptedSlot: string | null;
}

interface OfferView {
  id: string;
  status: string;
  body: string;
  compensation: string | null;
  startDate: string | null;
  endDate: string | null;
  hoursPerWeek: string | null;
  location: string | null;
  acceptDeadline: string | null;
  sentAt: string | null;
}

interface Props {
  applicationStatusId: string;
  stage: Stage;
  postingId: string;
  postingTitle: string;
  companyName: string;
  interview: InterviewView | null;
  offer: OfferView | null;
}

export function TraineeAppActions(props: Props) {
  return (
    <div className="space-y-5">
      {props.offer && <OfferPanel applicationStatusId={props.applicationStatusId} offer={props.offer} companyName={props.companyName} />}
      {props.interview && <InterviewPanel applicationStatusId={props.applicationStatusId} interview={props.interview} />}
      <PrepLink postingId={props.postingId} postingTitle={props.postingTitle} />
      {!["hired", "passed", "withdrawn"].includes(props.stage) && (
        <WithdrawPanel applicationStatusId={props.applicationStatusId} />
      )}
    </div>
  );
}

/* ── Offer ─────────────────────────────────────────────────── */

function OfferPanel({
  applicationStatusId,
  offer,
  companyName,
}: {
  applicationStatusId: string;
  offer: OfferView;
  companyName: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");

  async function respond(action: "accept" | "decline") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/applications/${applicationStatusId}/offer/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "decline" ? reason : undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Response failed");
        return;
      }
      router.refresh();
    });
  }

  const isPending = offer.status === "sent";
  const isAccepted = offer.status === "accepted";
  const isDeclined = offer.status === "declined";
  const isExpired = offer.status === "expired";

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <header className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Offer from {companyName}
          </p>
          <h2 className="text-xl font-bold text-fg mt-0.5 inline-flex items-center gap-2">
            <Briefcase size={18} className="text-brand-600" />
            {isAccepted
              ? "You accepted this offer"
              : isDeclined
                ? "You declined this offer"
                : isExpired
                  ? "This offer expired"
                  : "You've received an offer"}
          </h2>
          {isAccepted && (
            <p className="text-sm text-emerald-700 font-semibold mt-1 inline-flex items-center gap-1">
              <Trophy size={13} /> Congratulations.
            </p>
          )}
        </div>
        {offer.acceptDeadline && isPending && (
          <p className="text-xs font-mono tabular-nums text-amber-700">
            Respond by {new Date(offer.acceptDeadline).toLocaleDateString("en-CA", { dateStyle: "medium" })}
          </p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        {offer.compensation && <Fact label="Compensation" value={offer.compensation} />}
        {offer.startDate && <Fact label="Start" value={new Date(offer.startDate).toLocaleDateString("en-CA")} />}
        {offer.endDate && <Fact label="End" value={new Date(offer.endDate).toLocaleDateString("en-CA")} />}
        {offer.hoursPerWeek && <Fact label="Hours" value={offer.hoursPerWeek} />}
        {offer.location && <Fact label="Location" value={offer.location} />}
      </div>

      <article className="prose prose-sm max-w-none bg-elevated/30 rounded-xl p-4 mb-4 max-h-96 overflow-y-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{offer.body}</ReactMarkdown>
      </article>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2 mb-3 inline-flex items-start gap-2">
          <AlertCircle size={11} className="mt-0.5" /> {error}
        </p>
      )}

      {isPending && !showDecline && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-line">
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("accept")}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/25"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Accept offer (e-signature)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowDecline(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-card text-rose-700 hover:bg-rose-50 px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            Decline
          </button>
          <p className="text-[11px] text-muted mt-2 basis-full leading-snug">
            Accepting writes an electronic signature on file. By accepting, you'll
            auto-withdraw any other open applications you have on the platform.
          </p>
        </div>
      )}

      {showDecline && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 p-4 space-y-3">
          <p className="text-sm font-bold text-rose-900">Decline this offer</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Optional — tell them why (helps the employer + improves match quality)."
            className="w-full bg-card border border-rose-200 rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-y"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDecline(false)}
              className="text-xs text-muted hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond("decline")}
              className="text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5 disabled:opacity-50"
            >
              Confirm decline
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-elevated/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</p>
      <p className="text-sm font-semibold text-fg mt-0.5">{value}</p>
    </div>
  );
}

/* ── Interview ─────────────────────────────────────────────── */

function InterviewPanel({
  applicationStatusId,
  interview,
}: {
  applicationStatusId: string;
  interview: InterviewView;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");

  async function pickSlot() {
    if (!picked) {
      setError("Pick a slot first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/applications/${applicationStatusId}/interview/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedSlot: picked }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Pick failed");
        return;
      }
      router.refresh();
    });
  }

  async function decline() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/applications/${applicationStatusId}/interview/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decline: true, reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Decline failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <header className="mb-3">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Interview</p>
        <h2 className="text-base font-bold text-fg mt-0.5 inline-flex items-center gap-2">
          <Calendar size={14} className="text-brand-600" />
          {interview.status === "proposed"
            ? "Pick a time"
            : "Confirmed"}
        </h2>
      </header>

      {interview.notes && (
        <p className="text-xs text-muted mb-3 leading-snug">{interview.notes}</p>
      )}

      {interview.status === "accepted" && interview.acceptedSlot && (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 p-3">
          <p className="text-sm font-bold text-emerald-900">
            {new Date(interview.acceptedSlot).toLocaleString("en-CA", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          <p className="text-xs text-emerald-800 mt-1">
            {interview.format ?? "interview"}
            {interview.location && ` · ${interview.location}`}
          </p>
        </div>
      )}

      {interview.status === "proposed" && !showDecline && (
        <>
          <div className="space-y-2">
            {interview.proposedSlots.map((s) => (
              <label
                key={s}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                  picked === s
                    ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                    : "border-line bg-card hover:bg-elevated"
                }`}
              >
                <input
                  type="radio"
                  name="slot"
                  checked={picked === s}
                  onChange={() => setPicked(s)}
                  className="accent-brand-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    {new Date(s).toLocaleString("en-CA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="text-[10px] text-subtle">
                    {interview.format ?? "interview"}
                    {interview.location && ` · ${interview.location}`}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2 mt-3 inline-flex items-start gap-2">
              <AlertCircle size={11} className="mt-0.5" /> {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4 justify-end">
            <button
              type="button"
              onClick={() => setShowDecline(true)}
              className="text-xs text-muted hover:text-fg"
            >
              None of these work
            </button>
            <button
              type="button"
              disabled={busy || !picked}
              onClick={pickSlot}
              className="inline-flex items-center gap-1.5 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 px-3 py-1.5 disabled:opacity-50"
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Confirm slot
            </button>
          </div>
        </>
      )}

      {showDecline && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 p-3 space-y-2 mt-2">
          <p className="text-sm font-bold text-amber-900">None of the proposed slots work?</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional — share your availability so the employer can propose new times."
            className="w-full bg-card border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowDecline(false)} className="text-xs text-muted hover:text-fg">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={decline}
              className="text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 px-3 py-1.5 disabled:opacity-50"
            >
              Send back
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Withdraw ──────────────────────────────────────────────── */

function WithdrawPanel({ applicationStatusId }: { applicationStatusId: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/applications/${applicationStatusId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Withdraw failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-dashed border-line bg-card p-4 text-sm">
      {!showConfirm ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-muted">Changed your mind?</p>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="text-xs text-rose-700 hover:underline font-semibold"
          >
            Withdraw application
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold text-fg">Withdraw this application</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional — share why."
            className="w-full bg-card border border-line rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y"
          />
          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowConfirm(false)} className="text-xs text-muted hover:text-fg">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={withdraw}
              className="text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5 disabled:opacity-50"
            >
              Confirm withdraw
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Prep link (helpful nudge) ─────────────────────────────── */

function PrepLink({
  postingId,
  postingTitle,
}: {
  postingId: string;
  postingTitle: string;
}) {
  void postingTitle;
  return (
    <Link
      href={`/internships/${postingId}/prepare`}
      className="rounded-2xl bg-brand-50 ring-1 ring-inset ring-brand-200 p-4 hover:bg-brand-100 transition-colors group flex items-center justify-between gap-3"
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-700">
          Prep coach
        </p>
        <p className="text-sm font-bold text-fg mt-0.5">
          Sharpen your resume + interview answers
          <Sparkles size={12} className="inline ml-1 text-brand-600" />
        </p>
      </div>
      <ArrowRight size={16} className="text-brand-700 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
