"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";

interface UserResult {
  id: string;
  name: string | null;
  email: string;
  jobTitle: string | null;
  organization: string | null;
}

interface CourseOpt { id: string; title: string }
interface PathwayOpt { id: string; title: string }

export function BuddyInviteButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [picked, setPicked] = useState<UserResult | null>(null);

  const [focusType, setFocusType] = useState<"open" | "course" | "pathway">("open");
  const [focusId, setFocusId] = useState("");
  const [goalNote, setGoalNote] = useState("");

  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [pathways, setPathways] = useState<PathwayOpt[]>([]);

  // Search users (debounced)
  useEffect(() => {
    if (!open || picked) return;
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/buddy/search-users?q=${encodeURIComponent(search.trim())}`);
      if (res.ok) setResults(await res.json());
    }, 200);
    return () => clearTimeout(t);
  }, [search, open, picked]);

  // Lazy-load focus options on first need
  useEffect(() => {
    if (!open) return;
    if (focusType === "course" && courses.length === 0) {
      fetch("/api/courses").then((r) => r.ok && r.json()).then((d) => Array.isArray(d) && setCourses(d.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }))));
    }
    if (focusType === "pathway" && pathways.length === 0) {
      fetch("/api/pathways").then((r) => r.ok && r.json()).then((d) => Array.isArray(d) && setPathways(d.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }))));
    }
  }, [open, focusType, courses.length, pathways.length]);

  function reset() {
    setSearch(""); setResults([]); setPicked(null);
    setFocusType("open"); setFocusId(""); setGoalNote("");
    setError("");
  }

  async function submit() {
    if (!picked) return setError("Pick someone to invite.");
    if (focusType !== "open" && !focusId) return setError("Pick a course or pathway as the focus.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: picked.id,
          focusType,
          focusId: focusType === "open" ? null : focusId,
          goalNote: goalNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't send invite");
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="primary"><UserPlus size={14} /> Invite a buddy</Button>
      <Modal
        open={open}
        onClose={() => { if (!busy) { setOpen(false); reset(); } }}
        size="lg"
        title="Invite a learning buddy"
        description="Pair with someone for accountability. They'll get the invite on their dashboard and can accept or decline."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button onClick={submit} loading={busy} disabled={!picked}>Send invite</Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* User picker */}
          <Field label="Who" required>
            {picked ? (
              <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold flex items-center justify-center">
                  {(picked.name ?? picked.email)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-fg text-sm truncate">{picked.name ?? picked.email}</p>
                  <p className="text-xs text-subtle truncate">
                    {[picked.jobTitle, picked.organization].filter(Boolean).join(" · ") || picked.email}
                  </p>
                </div>
                <button
                  onClick={() => { setPicked(null); setSearch(""); }}
                  className="p-1.5 text-subtle hover:text-fg"
                  aria-label="Change"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="pl-9"
                />
                {results.length > 0 && (
                  <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-line bg-card divide-y divide-line">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => { setPicked(r); setSearch(""); setResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-elevated"
                        >
                          <p className="font-medium text-fg truncate">{r.name ?? r.email}</p>
                          <p className="text-xs text-subtle truncate">{r.email}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>

          {/* Focus */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Focus">
              <Select value={focusType} onChange={(e) => { setFocusType(e.target.value as "open" | "course" | "pathway"); setFocusId(""); }}>
                <option value="open">Open accountability</option>
                <option value="course">A specific course</option>
                <option value="pathway">A training pathway</option>
              </Select>
            </Field>
            {focusType !== "open" && (
              <Field label={focusType === "course" ? "Course" : "Pathway"} required>
                <Select value={focusId} onChange={(e) => setFocusId(e.target.value)}>
                  <option value="">Select…</option>
                  {(focusType === "course" ? courses : pathways).map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.title}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <Field label="Goal note" hint="Optional. Tell them why and how you want to collaborate.">
            <Textarea
              value={goalNote}
              onChange={(e) => setGoalNote(e.target.value)}
              rows={3}
              placeholder="e.g. Let's both finish the GMP cleanroom pathway by end of next month — check in weekly."
            />
          </Field>

          {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
