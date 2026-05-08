"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

/**
 * Course publish/unpublish toggle. On successful publish we surface a
 * toast confirmation with an "Inspect course" link so the staff member
 * can verify the live experience without leaving the workflow.
 */
export function PublishToggle({ courseId, status }: { courseId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // null = no toast; "published" / "unpublished" / "error" otherwise.
  const [toast, setToast] = useState<null | { kind: "published" | "unpublished" | "error"; message?: string }>(null);

  // Auto-dismiss toast after 8s. The Inspect link still works during
  // that window — and the toast is dismissible by click.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  async function toggle() {
    setLoading(true);
    setToast(null);
    const next = status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setToast({ kind: "error", message: (j as { error?: string }).error ?? "Couldn't update publish status." });
        return;
      }
      setToast({ kind: next === "published" ? "published" : "unpublished" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors disabled:opacity-60 inline-flex items-center gap-1.5 ${
          status === "published"
            ? "border-line text-muted hover:bg-elevated hover:text-fg"
            : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        }`}
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        {loading ? "…" : status === "published" ? "Unpublish" : "Publish"}
      </button>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md animate-fade-in"
          role="status"
        >
          {toast.kind === "published" && (
            <PublishedToast courseId={courseId} onDismiss={() => setToast(null)} />
          )}
          {toast.kind === "unpublished" && (
            <SimpleToast
              icon={<CheckCircle2 size={15} className="text-amber-600" />}
              tone="amber"
              title="Course unpublished"
              body="Trainees can no longer enrol or open it from the catalog."
              onDismiss={() => setToast(null)}
            />
          )}
          {toast.kind === "error" && (
            <SimpleToast
              icon={<AlertCircle size={15} className="text-rose-600" />}
              tone="rose"
              title="Publish failed"
              body={toast.message ?? "Try again, or check the audit log."}
              onDismiss={() => setToast(null)}
            />
          )}
        </div>
      )}
    </>
  );
}

function PublishedToast({ courseId, onDismiss }: { courseId: string; onDismiss: () => void }) {
  return (
    <div className="bg-card-solid border border-emerald-200 shadow-lg rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <CheckCircle2 size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-fg text-sm leading-tight">Course published</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          Trainees can now find it in the catalog and enrol. Take a look the way they will.
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Link
            href={`/courses/${courseId}`}
            className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Inspect course <ArrowRight size={11} />
          </Link>
          <Link
            href={`/courses?highlight=${courseId}`}
            className="text-xs font-medium inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-line text-muted hover:bg-elevated hover:text-fg"
          >
            View in catalog
          </Link>
          <button
            onClick={onDismiss}
            className="text-xs text-muted hover:text-fg ml-auto px-2"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function SimpleToast({
  icon, tone, title, body, onDismiss,
}: {
  icon: React.ReactNode;
  tone: "amber" | "rose";
  title: string;
  body: string;
  onDismiss: () => void;
}) {
  const cls = tone === "rose" ? "border-rose-200" : "border-amber-200";
  return (
    <div className={`bg-card-solid border ${cls} shadow-lg rounded-xl p-4 flex items-start gap-3`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-fg text-sm leading-tight">{title}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{body}</p>
      </div>
      <button onClick={onDismiss} className="text-xs text-muted hover:text-fg shrink-0">
        Dismiss
      </button>
    </div>
  );
}
