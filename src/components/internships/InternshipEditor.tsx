"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Save, Loader2, AlertCircle, Trash2, X, Plus,
} from "lucide-react";

export interface PostingValues {
  companyName: string;
  website: string;
  title: string;
  duration: string;
  hours: string;
  location: string;
  type: string;
  compensation: string;
  deadline: string;          // YYYY-MM-DD or ""
  keySkills: string[];
  positionDetails: string;
  status: "active" | "closed" | "draft";
}

const EMPTY: PostingValues = {
  companyName: "", website: "", title: "", duration: "", hours: "",
  location: "", type: "", compensation: "", deadline: "",
  keySkills: [], positionDetails: "", status: "active",
};

export function InternshipEditor({
  mode, postingId, initial,
}: {
  mode: "new" | "edit";
  postingId?: string;
  initial?: Partial<PostingValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PostingValues>({ ...EMPTY, ...initial });
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function set<K extends keyof PostingValues>(k: K, v: PostingValues[K]) {
    setValues((cur) => ({ ...cur, [k]: v }));
  }

  async function parseFromPaste() {
    if (pasteText.trim().length < 30) {
      setParseError("Paste at least a few sentences from the job description.");
      return;
    }
    setParsing(true);
    setParseError(null);
    setParseSuccess(false);
    try {
      const res = await fetch("/api/admin/internships/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean; posting?: Partial<PostingValues>; error?: string;
      };
      if (!res.ok || !j.posting) {
        setParseError(j.error ?? "Couldn't parse the description.");
        return;
      }
      // Merge AI output over current values; keep status the user picked.
      setValues((cur) => ({
        ...cur,
        ...j.posting,
        keySkills: j.posting!.keySkills?.slice(0, 5) ?? [],
      } as PostingValues));
      setParseSuccess(true);
    } finally {
      setParsing(false);
    }
  }

  async function save() {
    if (!values.companyName.trim() || !values.title.trim() || !values.positionDetails.trim()) {
      setSaveError("Company name, title, and position details are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const url = mode === "new"
        ? "/api/admin/internships"
        : `/api/admin/internships/${postingId}`;
      const res = await fetch(url, {
        method: mode === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean; posting?: { id: string }; error?: string;
      };
      if (!res.ok) {
        setSaveError(j.error ?? "Save failed.");
        return;
      }
      const id = j.posting?.id ?? postingId;
      router.push(id ? `/internships/${id}` : "/internships");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!postingId) return;
    if (!confirm("Delete this posting? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/internships/${postingId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(j.error ?? "Delete failed.");
        return;
      }
      router.push("/internships");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function addSkill() {
    if (values.keySkills.length >= 5) return;
    set("keySkills", [...values.keySkills, ""]);
  }
  function setSkill(i: number, v: string) {
    const next = [...values.keySkills];
    next[i] = v;
    set("keySkills", next);
  }
  function removeSkill(i: number) {
    set("keySkills", values.keySkills.filter((_, j) => j !== i));
  }

  const ipt =
    "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* AI paste-and-parse — only on new */}
      {mode === "new" && (
        <section className="bg-card border border-line rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-fg">Paste the job description</h2>
              <p className="text-xs text-muted mt-0.5">
                Drop in the raw text from a PDF, email, web page, or doc. The AI extracts company, role, dates, skills, and details — you review and save.
              </p>
            </div>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder="Paste anything — an emailed posting, a PDF copy, an internal description…"
            className={ipt}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-[11px] text-subtle">
              {pasteText.length.toLocaleString()} characters
            </div>
            <button
              type="button"
              onClick={parseFromPaste}
              disabled={parsing || pasteText.trim().length < 30}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm shadow-brand-600/25 transition-colors"
            >
              {parsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {parsing ? "Parsing…" : "Parse with AI"}
            </button>
          </div>
          {parseError && (
            <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {parseError}
            </div>
          )}
          {parseSuccess && !parseError && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-3 py-2">
              Parsed — review the fields below and edit as needed before saving.
            </div>
          )}
        </section>
      )}

      {/* Form */}
      <section className="bg-card border border-line rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-fg">{mode === "new" ? "Posting" : "Edit posting"}</h2>

        <Group title="Employer">
          <Field label="Company name" required>
            <input className={ipt} value={values.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </Field>
          <Field label="Website">
            <input className={ipt} value={values.website} onChange={(e) => set("website", e.target.value)} placeholder="example.com" />
          </Field>
        </Group>

        <Group title="Position">
          <Field label="Title" full required>
            <input className={ipt} value={values.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Duration">
            <input className={ipt} value={values.duration} onChange={(e) => set("duration", e.target.value)} placeholder="4 months" />
          </Field>
          <Field label="Hours">
            <input className={ipt} value={values.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Full-time, 40h/week" />
          </Field>
          <Field label="Location">
            <input className={ipt} value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Toronto, ON" />
          </Field>
          <Field label="Type">
            <input className={ipt} value={values.type} onChange={(e) => set("type", e.target.value)} placeholder="Internship / Co-op" />
          </Field>
          <Field label="Compensation">
            <input className={ipt} value={values.compensation} onChange={(e) => set("compensation", e.target.value)} placeholder="$25/hr, Paid, Unpaid…" />
          </Field>
          <Field label="Deadline">
            <input type="date" className={ipt} value={values.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </Field>
        </Group>

        <Group title="Key skills (up to 5)">
          <div className="col-span-full space-y-2">
            {values.keySkills.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={ipt}
                  value={s}
                  onChange={(e) => setSkill(i, e.target.value)}
                  placeholder={`Skill ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeSkill(i)}
                  className="text-subtle hover:text-rose-600 p-1.5"
                  aria-label="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {values.keySkills.length < 5 && (
              <button
                type="button"
                onClick={addSkill}
                className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add skill
              </button>
            )}
          </div>
        </Group>

        <Group title="Position details">
          <div className="col-span-full">
            <textarea
              className={ipt}
              value={values.positionDetails}
              onChange={(e) => set("positionDetails", e.target.value)}
              rows={10}
              placeholder="Multi-paragraph description. Will display with paragraph breaks preserved."
            />
          </div>
        </Group>

        <Group title="Status">
          <div className="col-span-full flex gap-2">
            {(["active", "draft", "closed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("status", s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  values.status === s
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-card text-muted border-line hover:border-line-strong"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Group>
      </section>

      {saveError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {saveError}
        </div>
      )}

      <div className="flex items-center gap-2 justify-end">
        {mode === "edit" && (
          <button
            type="button"
            onClick={destroy}
            disabled={deleting || saving}
            className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium px-4 py-2 rounded-lg border border-rose-200 disabled:opacity-50 mr-auto"
          >
            <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete posting"}
          </button>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-muted hover:text-fg px-4 py-2 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2 rounded-lg shadow-md shadow-brand-600/25 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : mode === "new" ? "Publish posting" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label, required, full, children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? "col-span-full" : ""}`}>
      <span className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
