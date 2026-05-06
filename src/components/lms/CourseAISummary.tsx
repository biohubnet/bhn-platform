"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  courseId: string;
  initialSummary: string | null;
  canManage: boolean;
}

export function CourseAISummary({ courseId, initialSummary, canManage }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/summary`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Generation failed");
        return;
      }
      setSummary(j.aiSummary);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!summary && !canManage) return null;

  return (
    <div className="bg-card rounded-2xl border border-line p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-sm">
          <Sparkles size={14} />
        </div>
        <h3 className="font-semibold text-fg">AI summary</h3>
        {canManage && summary && (
          <Button onClick={generate} loading={busy} size="sm" variant="ghost" className="ml-auto">
            <RefreshCw size={12} /> Regenerate
          </Button>
        )}
      </div>
      {summary ? (
        <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{summary}</p>
      ) : canManage ? (
        <div className="text-center py-6">
          <p className="text-sm text-subtle mb-3">No summary yet. Generate one for learners.</p>
          <Button onClick={generate} loading={busy} variant="primary">
            <Sparkles size={14} /> Generate summary
          </Button>
        </div>
      ) : null}
      {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-3">{error}</p>}
    </div>
  );
}
