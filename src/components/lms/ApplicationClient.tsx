"use client";
/**
 * Trainee "My Application" — three sections:
 *   1) Resume       (PDF / DOCX, ≤10 MB)
 *   2) Video intro  (MP4 / MOV / WebM, ≤60 MB, ~1 minute)
 *   3) Elevator pitch (≤650 chars)
 *
 * Uploads go through /api/profile/application/upload which writes to
 * R2 and patches the user row in one round-trip. The pitch and any
 * "remove this" actions go through PATCH /api/profile/application.
 *
 * Pattern note: each section is independently saveable. We deliberately
 * don't have a single "Save all" button — the trainee may upload a
 * resume now and write the pitch tomorrow, and either should land
 * without juggling form state.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Video, MessageSquareQuote, Upload, Trash2, ExternalLink,
  Check, AlertCircle, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import Link from "next/link";

const PITCH_MAX = 650;

interface Initial {
  resumeUrl: string | null;
  videoIntroUrl: string | null;
  elevatorPitch: string | null;
  applicationUpdatedAt: string | null;
}

type Tone = "ok" | "err" | null;
interface Toast { tone: Tone; msg: string }

function bust(url: string | null) {
  // Force browsers to refetch after re-uploads — the R2 key is
  // deterministic per user, so the stale CDN copy can linger.
  if (!url) return null;
  return `${url}?v=${Date.now()}`;
}

export function ApplicationClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [resumeUrl, setResumeUrl] = useState<string | null>(initial.resumeUrl);
  const [videoUrl, setVideoUrl] = useState<string | null>(initial.videoIntroUrl);
  const [pitch, setPitch] = useState(initial.elevatorPitch ?? "");
  const [updatedAt, setUpdatedAt] = useState<string | null>(initial.applicationUpdatedAt);

  const [busyKind, setBusyKind] = useState<"resume" | "video" | "pitch" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const resumeInput = useRef<HTMLInputElement>(null);
  const videoInput  = useRef<HTMLInputElement>(null);

  function flash(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }

  async function uploadFile(kind: "resume" | "video", file: File) {
    setBusyKind(kind);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/profile/application/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash({ tone: "err", msg: j.error ?? "Upload failed." });
        return;
      }
      if (kind === "resume") setResumeUrl(j.url);
      else setVideoUrl(j.url);
      setUpdatedAt(j.applicationUpdatedAt ?? new Date().toISOString());
      flash({ tone: "ok", msg: kind === "resume" ? "Resume saved." : "Video saved." });
      router.refresh();
    } finally {
      setBusyKind(null);
    }
  }

  async function clearArtifact(kind: "resume" | "video") {
    if (!confirm(kind === "resume"
      ? "Remove your resume? Forms that auto-fill will fall back to manual upload until you replace it."
      : "Remove your video introduction?")) return;
    setBusyKind(kind);
    try {
      const field = kind === "resume" ? "resumeUrl" : "videoIntroUrl";
      const res = await fetch("/api/profile/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash({ tone: "err", msg: j.error ?? "Couldn't remove." });
        return;
      }
      if (kind === "resume") setResumeUrl(null);
      else setVideoUrl(null);
      setUpdatedAt(j.applicationUpdatedAt ?? new Date().toISOString());
      flash({ tone: "ok", msg: "Removed." });
      router.refresh();
    } finally {
      setBusyKind(null);
    }
  }

  async function savePitch() {
    if (pitch.length > PITCH_MAX) return;
    setBusyKind("pitch");
    try {
      const res = await fetch("/api/profile/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elevatorPitch: pitch.trim() ? pitch : null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash({ tone: "err", msg: j.error ?? "Couldn't save." });
        return;
      }
      setUpdatedAt(j.applicationUpdatedAt ?? new Date().toISOString());
      flash({ tone: "ok", msg: "Pitch saved." });
      router.refresh();
    } finally {
      setBusyKind(null);
    }
  }

  const pitchDirty = (initial.elevatorPitch ?? "") !== pitch;
  const pitchOver = pitch.length > PITCH_MAX;

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
            toast.tone === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.tone === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Resume */}
      <Card className="p-5">
        <SectionHeader
          icon={<FileText size={16} />}
          title="Resume"
          description="PDF or DOCX, up to 10 MB. Used to auto-fill talent applications and seed your skill profile."
        />
        <div className="mt-4">
          {resumeUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-line bg-elevated/40">
              <FileText size={18} className="text-brand-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg truncate">Resume on file</p>
                <a
                  href={bust(resumeUrl) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                >
                  Open <ExternalLink size={11} />
                </a>
              </div>
              <Button
                variant="ghost"
                onClick={() => resumeInput.current?.click()}
                disabled={busyKind === "resume"}
              >
                <Upload size={14} /> Replace
              </Button>
              <Button
                variant="ghost"
                onClick={() => clearArtifact("resume")}
                disabled={busyKind === "resume"}
                className="text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => resumeInput.current?.click()}
              disabled={busyKind === "resume"}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-lg border-2 border-dashed border-line hover:border-brand-300 hover:bg-brand-50/40 transition-colors text-muted hover:text-brand-700"
            >
              {busyKind === "resume" ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <span className="text-sm font-medium">
                {busyKind === "resume" ? "Uploading…" : "Upload resume"}
              </span>
              <span className="text-xs text-subtle">PDF or DOCX, up to 10 MB</span>
            </button>
          )}
          <input
            ref={resumeInput}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile("resume", f);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {/* Video introduction */}
      <Card className="p-5">
        <SectionHeader
          icon={<Video size={16} />}
          title="1-minute video introduction"
          description="MP4, MOV, or WebM, up to 60 MB. Aim for under a minute — employers scan dozens, so it should hit who you are, what you've done, and what you're looking for, fast."
        />
        <div className="mt-4">
          {videoUrl ? (
            <div className="space-y-3">
              <video
                src={bust(videoUrl) ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[360px] rounded-lg border border-line bg-black"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => videoInput.current?.click()}
                  disabled={busyKind === "video"}
                >
                  <Upload size={14} /> Replace
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => clearArtifact("video")}
                  disabled={busyKind === "video"}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={14} /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              disabled={busyKind === "video"}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-lg border-2 border-dashed border-line hover:border-brand-300 hover:bg-brand-50/40 transition-colors text-muted hover:text-brand-700"
            >
              {busyKind === "video" ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <span className="text-sm font-medium">
                {busyKind === "video" ? "Uploading…" : "Upload video"}
              </span>
              <span className="text-xs text-subtle">MP4 / MOV / WebM, up to 60 MB</span>
            </button>
          )}
          <input
            ref={videoInput}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile("video", f);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {/* Elevator pitch */}
      <Card className="p-5">
        <SectionHeader
          icon={<MessageSquareQuote size={16} />}
          title="Elevator pitch"
          description="A short paragraph an employer or instructor would read in 30 seconds. Pulled into talent applications and the candidate snapshot."
        />
        <div className="mt-4 space-y-3">
          <Field
            hint={`${pitch.length} / ${PITCH_MAX} characters`}
            error={pitchOver ? `Trim by ${pitch.length - PITCH_MAX}.` : undefined}
          >
            <Textarea
              rows={6}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="I'm a Master's-level cell-culture engineer with 3 years on bioreactor scale-up, and I'm looking for a downstream role at a CDMO where I can pair my analytical chemistry background with hands-on process work…"
            />
          </Field>
          <div className="flex items-center justify-end">
            <Button
              onClick={savePitch}
              disabled={!pitchDirty || pitchOver || busyKind === "pitch"}
              loading={busyKind === "pitch"}
            >
              Save pitch
            </Button>
          </div>
        </div>
      </Card>

      {/* Footer: jump to talent application + last-updated */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
        <p className="text-xs text-subtle">
          {updatedAt
            ? `Last updated ${new Date(updatedAt).toLocaleString(undefined, {
                month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
              })}`
            : "No updates yet."}
        </p>
        <Link
          href="/forms/talent-application"
          className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
        >
          Submit a talent application <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({
  icon, title, description,
}: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-fg">
        <span className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-brand-50 text-brand-600 border border-brand-200">
          {icon}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="text-sm text-muted mt-1.5">{description}</p>
    </div>
  );
}
