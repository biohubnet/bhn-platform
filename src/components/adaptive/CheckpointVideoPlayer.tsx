"use client";
/**
 * Minimal HTML5 <video> wrapper that pauses at author-placed
 * checkpoint timestamps and shows an inline question card. On a
 * correct answer the video resumes; on a wrong answer the player
 * shows the explanation but lets the trainee continue at their
 * own pace (we don't enforce rewinds — Mayer's "learner control"
 * principle: punitive UX backfires).
 *
 * We track which checkpoints have been crossed in a Set so the
 * trainee isn't re-prompted if they scrub backwards.
 */
import { useEffect, useRef, useState } from "react";
import { Play, Check, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlayerCheckpoint {
  id: string;
  timestampSeconds: number;
  question: {
    id: string;
    text: string;
    type: string;
    options: string | null;
    topic: string | null;
  } | null;
}

export function CheckpointVideoPlayer({
  videoUrl, moduleId, checkpoints,
}: {
  videoUrl: string;
  moduleId: string;
  checkpoints: PlayerCheckpoint[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<PlayerCheckpoint | null>(null);

  // Listen for time updates and trigger checkpoints in order.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onTime() {
      if (!v) return;
      if (active) return; // already showing one
      const t = v.currentTime;
      // Find the first unseen checkpoint that the playhead has just
      // crossed. Tolerance of 0.5s so we don't miss it on browsers
      // that throttle timeupdate.
      const next = checkpoints.find(
        (cp) => !seenIds.has(cp.id) && t >= cp.timestampSeconds - 0.25,
      );
      if (next) {
        v.pause();
        setActive(next);
      }
    }
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [active, checkpoints, seenIds]);

  function dismiss(checkpointId: string) {
    setSeenIds((cur) => {
      const next = new Set(cur);
      next.add(checkpointId);
      return next;
    });
    setActive(null);
    // Resume playback after a tick so React commits state first.
    setTimeout(() => videoRef.current?.play().catch(() => undefined), 0);
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        playsInline
        className="w-full rounded-xl bg-black aspect-video"
      />

      {checkpoints.length > 0 && (
        <p className="text-[11px] text-subtle mt-2">
          This video has {checkpoints.length} checkpoint{checkpoints.length === 1 ? "" : "s"} —
          it&apos;ll pause briefly so you can answer a quick question.
        </p>
      )}

      {active && (
        <CheckpointModal
          moduleId={moduleId}
          checkpoint={active}
          onDismiss={() => dismiss(active.id)}
        />
      )}
    </div>
  );
}

function CheckpointModal({
  moduleId, checkpoint, onDismiss,
}: {
  moduleId: string;
  checkpoint: PlayerCheckpoint;
  onDismiss: () => void;
}) {
  const [picked, setPicked] = useState<string>("");
  const [free, setFree] = useState<string>("");
  const [submitted, setSubmitted] = useState<{ correct: boolean; explanation: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  // No question = a "pause-and-reflect" checkpoint. Render a
  // single-line continue card.
  if (!checkpoint.question) {
    return (
      <Wrapper onDismiss={onDismiss} title="Take a breath">
        <p className="text-sm text-muted">
          Pause-and-reflect checkpoint placed by the author. Continue when you&apos;re ready.
        </p>
        <Continue onClick={onDismiss} />
      </Wrapper>
    );
  }

  let optionList: string[] = [];
  if (checkpoint.question.type === "multiple_choice" && checkpoint.question.options) {
    try {
      const parsed = JSON.parse(checkpoint.question.options);
      if (Array.isArray(parsed)) optionList = parsed.filter((s) => typeof s === "string");
    } catch { /* leave empty */ }
  }

  async function submit() {
    if (busy) return;
    const answer = optionList.length > 0 ? picked : free;
    if (!answer.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/modules/${moduleId}/checkpoints/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointId: checkpoint.id, answer }),
      });
      const j = await res.json().catch(() => ({}));
      setSubmitted({ correct: !!j.correct, explanation: j.explanation ?? null });
    } catch {
      setSubmitted({ correct: false, explanation: "We couldn't grade right now — moving on." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Wrapper onDismiss={onDismiss} title={checkpoint.question.topic ?? "Checkpoint"}>
      <p className="text-sm text-fg leading-relaxed">{checkpoint.question.text}</p>

      {!submitted ? (
        <>
          {optionList.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {optionList.map((opt) => (
                <li key={opt}>
                  <label className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-inset cursor-pointer text-sm transition-colors",
                    picked === opt ? "bg-brand-50 text-brand-800 ring-brand-200" : "ring-line text-muted hover:bg-elevated/40",
                  )}>
                    <input
                      type="radio"
                      name="checkpoint"
                      value={opt}
                      checked={picked === opt}
                      onChange={(e) => setPicked(e.target.value)}
                      className="accent-brand-600"
                    />
                    {opt}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <input
              value={free}
              onChange={(e) => setFree(e.target.value)}
              placeholder="Your answer"
              className="mt-3 w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-full text-xs text-muted hover:text-fg"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !(optionList.length > 0 ? picked : free.trim())}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white"
            >
              Submit
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={cn(
            "mt-3 rounded-xl px-3 py-3 ring-1 ring-inset",
            submitted.correct
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200",
          )}>
            <p className="text-sm font-semibold inline-flex items-center gap-1.5">
              {submitted.correct ? <Check size={13} /> : <AlertCircle size={13} />}
              {submitted.correct ? "Right." : "Not quite."}
            </p>
            {submitted.explanation && (
              <p className="text-xs mt-1.5 leading-relaxed opacity-90">{submitted.explanation}</p>
            )}
          </div>
          <Continue onClick={onDismiss} />
        </>
      )}
    </Wrapper>
  );
}

function Wrapper({
  title, onDismiss, children,
}: {
  title: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-10 rounded-xl bg-black/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-card border border-line rounded-2xl shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <p className="text-sm font-semibold text-fg leading-snug">{title}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Skip checkpoint"
            className="p-1.5 rounded-full text-subtle hover:text-fg hover:bg-elevated"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Continue({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-end">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white"
      >
        <Play size={11} /> Continue
      </button>
    </div>
  );
}
