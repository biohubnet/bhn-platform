"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, User, BookOpen, Calendar, Send, AlertTriangle, CheckCircle2,
  FileText, X, Ghost, Beaker, Sparkles,
} from "lucide-react";

export interface UserOption {
  id: string;
  name: string | null;
  email: string;
  role: string;
  accountKind: string;
  organization: string | null;
  credits: number;
}

export interface CourseOption {
  id: string;
  title: string;
  category: string | null;
  creditCost: number;
  duration: number | null;
}

type Mode = "single" | "csv";

/**
 * Two-mode enrollment composer. Mode "single" handles one-user × many-
 * courses; mode "csv" handles many-users × many-courses via paste. The
 * single-user mode is the common admin path (onboarding a new trainee);
 * CSV is the escape hatch for batch operations.
 */
export function NewEnrollmentForm({
  users,
  courses,
}: {
  users: UserOption[];
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("single");
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      {/* Mode tabs */}
      <div className="flex border-b border-line gap-1">
        <ModeTab active={mode === "single"} onClick={() => setMode("single")}>
          One user → many courses
        </ModeTab>
        <ModeTab active={mode === "csv"} onClick={() => setMode("csv")}>
          CSV bulk import
        </ModeTab>
      </div>

      {mode === "single"
        ? <SingleUserMode users={users} courses={courses} onDone={() => startTransition(() => router.refresh())} />
        : <CsvMode users={users} courses={courses} onDone={() => startTransition(() => router.refresh())} />}
    </div>
  );
}

function ModeTab({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

// ─── SINGLE-USER MODE ─────────────────────────────────────────────

function SingleUserMode({
  users, courses, onDone,
}: {
  users: UserOption[];
  courses: CourseOption[];
  onDone: () => void;
}) {
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [courseQuery, setCourseQuery] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ count: number; userName: string } | null>(null);

  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return users.slice(0, 20);
    const q = userQuery.trim().toLowerCase();
    return users
      .filter((u) => `${u.name ?? ""} ${u.email}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [users, userQuery]);

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      `${c.title} ${c.category ?? ""}`.toLowerCase().includes(q),
    );
  }, [courses, courseQuery]);

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!selectedUser) {
      setError("Pick a user first.");
      return;
    }
    if (selectedCourseIds.size === 0) {
      setError("Pick at least one course.");
      return;
    }
    setSubmitting(true);
    setError(null);
    let ok = 0;
    let failed = 0;
    for (const courseId of Array.from(selectedCourseIds)) {
      try {
        const res = await fetch("/api/admin/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.id,
            courseId,
            dueDate: dueDate || undefined,
          }),
        });
        if (res.ok) ok++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setSubmitting(false);
    if (failed === 0) {
      setSuccess({ count: ok, userName: selectedUser.name ?? selectedUser.email });
      setSelectedCourseIds(new Set());
      onDone();
    } else {
      setError(`${ok} succeeded, ${failed} failed. Check the user has access to all selected courses.`);
    }
  }

  // Estimated total credit cost (informational — admin overrides anyway)
  const totalCredits = useMemo(() => {
    let sum = 0;
    for (const c of courses) if (selectedCourseIds.has(c.id)) sum += c.creditCost;
    return sum;
  }, [courses, selectedCourseIds]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
      {/* Step 1: Pick user */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
        <header>
          <h2 className="text-sm font-bold text-fg inline-flex items-center gap-1.5">
            <User size={14} className="text-brand-600" />
            Step 1 — Select user
          </h2>
        </header>

        {selectedUser ? (
          <div className="rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-200 p-3">
            <div className="flex items-start gap-2">
              <UserKindBadge kind={selectedUser.accountKind} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-900 truncate">
                  {selectedUser.name ?? <span className="italic">No name</span>}
                </p>
                <p className="text-xs text-brand-800 font-mono truncate">{selectedUser.email}</p>
                <p className="text-[11px] text-brand-700 mt-1">
                  {selectedUser.role} · {selectedUser.credits.toLocaleString()} credits
                  {selectedUser.organization && ` · ${selectedUser.organization}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedUser(null); setUserQuery(""); }}
                className="text-brand-700 hover:bg-brand-100 rounded p-1"
                title="Pick someone else"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="relative block">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name or email…"
                className="w-full bg-background border border-line rounded-lg pl-8 pr-3 py-2 text-sm"
                autoFocus
              />
            </label>
            <ul className="max-h-[420px] overflow-y-auto border border-line rounded-lg bg-background divide-y divide-line">
              {filteredUsers.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-muted italic">
                  No matching users.
                </li>
              ) : (
                filteredUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="w-full text-left px-3 py-2 hover:bg-elevated flex items-start gap-2"
                    >
                      <UserKindBadge kind={u.accountKind} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-fg truncate">
                          {u.name ?? <span className="italic text-muted">No name</span>}
                        </p>
                        <p className="text-xs text-muted truncate">{u.email}</p>
                        <p className="text-[11px] text-subtle">
                          {u.role} · {u.credits.toLocaleString()} cr.
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <p className="text-[11px] text-subtle">
              Showing up to 20. Refine the search if you don't see who you need.
            </p>
          </>
        )}
      </section>

      {/* Step 2 + 3: Courses + Due + Submit */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-4">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-fg inline-flex items-center gap-1.5">
            <BookOpen size={14} className="text-brand-600" />
            Step 2 — Select courses
          </h2>
          <p className="text-xs font-mono tabular-nums text-subtle">
            <span className={selectedCourseIds.size > 0 ? "text-brand-700 font-bold" : ""}>
              {selectedCourseIds.size}
            </span>
            {" "}selected
          </p>
        </header>

        <label className="relative block">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={courseQuery}
            onChange={(e) => setCourseQuery(e.target.value)}
            placeholder="Filter courses…"
            className="w-full bg-background border border-line rounded-lg pl-8 pr-3 py-2 text-sm"
          />
        </label>

        <ul className="max-h-[300px] overflow-y-auto border border-line rounded-lg bg-background divide-y divide-line">
          {filteredCourses.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-muted italic">
              No matching courses.
            </li>
          ) : (
            filteredCourses.map((c) => {
              const picked = selectedCourseIds.has(c.id);
              return (
                <li key={c.id}>
                  <label className="flex items-start gap-2 px-3 py-2 hover:bg-elevated cursor-pointer">
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => toggleCourse(c.id)}
                      className="mt-1 accent-brand-600 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight truncate ${picked ? "text-brand-800" : "text-fg"}`}>
                        {c.title}
                      </p>
                      <p className="text-[11px] text-muted">
                        {c.category && <>{c.category} · </>}
                        {c.creditCost > 0 ? `${c.creditCost} cr.` : "Free"}
                        {c.duration && ` · ${c.duration} min`}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })
          )}
        </ul>

        <header className="pt-2 border-t border-line">
          <h2 className="text-sm font-bold text-fg inline-flex items-center gap-1.5">
            <Calendar size={14} className="text-brand-600" />
            Step 3 — Optional due date
          </h2>
        </header>

        <div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full sm:max-w-xs bg-background border border-line rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-[11px] text-subtle mt-1">
            Applies to every selected course. Skip for no deadline.
          </p>
        </div>

        {totalCredits > 0 && (
          <div className="rounded-xl bg-elevated px-3 py-2 text-xs text-muted">
            Combined credit cost: <span className="font-mono tabular-nums text-fg font-bold">{totalCredits.toLocaleString()}</span>{" "}
            <span className="italic">— informational only; admin enrollments bypass the credit deduction.</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
            <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3 py-2 text-xs text-emerald-900 flex items-start gap-2">
            <CheckCircle2 size={11} className="text-emerald-700 shrink-0 mt-0.5" />
            Enrolled <strong>{success.userName}</strong> in {success.count} course{success.count === 1 ? "" : "s"}.
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !selectedUser || selectedCourseIds.size === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 surface-shadow"
          >
            <Send size={13} />
            {submitting
              ? "Enrolling…"
              : `Enroll ${selectedUser ? (selectedUser.name?.split(" ")[0] ?? "user") : "user"} in ${selectedCourseIds.size || "—"} course${selectedCourseIds.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── CSV MODE ─────────────────────────────────────────────────────

function CsvMode({
  users, courses, onDone,
}: {
  users: UserOption[];
  courses: CourseOption[];
  onDone: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importCsv() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    const lines = csv.trim().split("\n").slice(1); // skip header
    let ok = 0;
    let fail = 0;
    const failures: string[] = [];
    for (const raw of lines) {
      const [email, courseTitle, dueDateStr] = raw.split(",").map((s) => s.trim());
      if (!email || !courseTitle) { fail++; failures.push(`${raw}  → missing email/title`); continue; }
      const user = users.find((u) => u.email === email);
      const course = courses.find((c) => c.title === courseTitle);
      if (!user) { fail++; failures.push(`${email} → no such user`); continue; }
      if (!course) { fail++; failures.push(`${courseTitle} → no such course`); continue; }
      try {
        const res = await fetch("/api/admin/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            courseId: course.id,
            dueDate: dueDateStr || undefined,
          }),
        });
        if (res.ok) ok++;
        else { fail++; failures.push(`${email} + ${courseTitle} → ${res.status}`); }
      } catch {
        fail++;
        failures.push(`${email} + ${courseTitle} → fetch failed`);
      }
    }
    setResult(`${ok} succeeded · ${fail} failed${failures.length ? "\n\nFailures:\n" + failures.join("\n") : ""}`);
    setSubmitting(false);
    onDone();
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <header>
        <h2 className="text-sm font-bold text-fg inline-flex items-center gap-1.5">
          <FileText size={14} className="text-brand-600" />
          Paste CSV
        </h2>
        <p className="text-xs text-muted mt-1">
          One line per enrollment. Header row required. Course title must
          match the published course exactly (case-sensitive). Due date is
          optional, in <code className="font-mono text-fg">YYYY-MM-DD</code>.
        </p>
      </header>

      <textarea
        rows={10}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={"email,course_title,due_date\nphantom-a1b2@bhn.test,GMP Basics,\nphantom-a1b2@bhn.test,Aseptic Processing,2026-08-01"}
        className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm font-mono"
      />

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
          <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {result && (
        <pre className="rounded-xl bg-elevated p-3 text-xs text-fg whitespace-pre-wrap font-mono">{result}</pre>
      )}

      <div>
        <button
          type="button"
          onClick={importCsv}
          disabled={submitting || !csv.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Importing…" : "Import"}
        </button>
      </div>
    </section>
  );
}

function UserKindBadge({ kind }: { kind: string }) {
  if (kind === "phantom")
    return <Ghost size={14} className="text-amber-600 shrink-0 mt-0.5" />;
  if (kind === "sandbox")
    return <Beaker size={14} className="text-cyan-600 shrink-0 mt-0.5" />;
  if (kind === "demo")
    return <Sparkles size={14} className="text-violet-600 shrink-0 mt-0.5" />;
  if (kind === "showcase")
    return <Sparkles size={14} className="text-brand-600 shrink-0 mt-0.5" />;
  return <User size={14} className="text-subtle shrink-0 mt-0.5" />;
}
