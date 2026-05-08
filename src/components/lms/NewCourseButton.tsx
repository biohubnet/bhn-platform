"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { COURSE_TOPICS, COURSE_DELIVERY, COURSE_PROVIDERS } from "@/lib/courses/filters";

/**
 * "New Course" modal. Topic / Delivery / Provider use input + datalist
 * so admins can either pick from the curated list (sourced from the
 * filter ontology at /admin/course-filters) OR type a free-text value
 * — useful for one-off providers or new categories.
 *
 * All inputs use the standard theme-aware classes (bg-card-solid +
 * text-fg + border-line) so the form reads correctly under every
 * theme. The earlier `border-gray-300` only-classes meant text was
 * invisible against the user-agent white default on dark themes.
 */
export function NewCourseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    courseType: "scorm",
    passingScore: 80,
    topic: "",
    delivery: "",
    provider: "",
    isSpecial: false,
  });
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      const course = await res.json();
      setOpen(false);
      router.push(`/courses/${course.id}`);
      router.refresh();
    }
  }

  const inputCls =
    "w-full bg-card-solid text-fg placeholder:text-subtle border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Plus size={16} />
        New Course
      </button>

      {open && (
        <div className="fixed inset-0 bg-backdrop z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="popover p-6 w-full max-w-md shadow-2xl animate-slide-up-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-fg">Create Course</h2>
              <button onClick={() => setOpen(false)} className="text-subtle hover:text-fg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Title *</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Course title"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Description</label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Category</label>
                  <input
                    className={inputCls}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Safety"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Type</label>
                  <select
                    className={inputCls}
                    value={form.courseType}
                    onChange={(e) => setForm({ ...form, courseType: e.target.value })}
                  >
                    <option value="scorm">SCORM</option>
                    <option value="xapi">xAPI</option>
                    <option value="content">Content</option>
                    <option value="assessment">Assessment</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={form.passingScore}
                  onChange={(e) => setForm({ ...form, passingScore: parseInt(e.target.value) })}
                />
              </div>

              {/* Catalog filter facets — used by the Courses page filter rail.
                  Admin can pick from the curated list OR type a custom value;
                  custom values flow through to /admin/course-filters where
                  they can be promoted to the canonical list later. */}
              <div className="border-t border-line pt-3 mt-1">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle mb-2">
                  Catalog filters
                </p>
                <p className="text-[11px] text-muted mb-3 leading-relaxed">
                  Pick from suggestions or type a custom value. New ones surface in <a href="/admin/course-filters" className="text-brand-600 hover:underline">/admin/course-filters</a> where you can canonicalise them.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Topic</label>
                    <input
                      list="course-topic-options"
                      className={inputCls}
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      placeholder="e.g. Bioprocess Engineering"
                    />
                    <datalist id="course-topic-options">
                      {COURSE_TOPICS.map((o) => <option key={o} value={o} />)}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Delivery</label>
                      <input
                        list="course-delivery-options"
                        className={inputCls}
                        value={form.delivery}
                        onChange={(e) => setForm({ ...form, delivery: e.target.value })}
                        placeholder="e.g. Asynchronous"
                      />
                      <datalist id="course-delivery-options">
                        {COURSE_DELIVERY.map((o) => <option key={o} value={o} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Provider</label>
                      <input
                        list="course-provider-options"
                        className={inputCls}
                        value={form.provider}
                        onChange={(e) => setForm({ ...form, provider: e.target.value })}
                        placeholder="e.g. CASTL"
                      />
                      <datalist id="course-provider-options">
                        {COURSE_PROVIDERS.map((o) => <option key={o} value={o} />)}
                      </datalist>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isSpecial}
                      onChange={(e) => setForm({ ...form, isSpecial: e.target.checked })}
                      className="accent-brand-600"
                    />
                    Special program / workshop (instructor-led, limited seats)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-line text-muted text-sm font-medium py-2 rounded-lg hover:bg-elevated hover:text-fg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={!form.title || loading}
                className="flex-1 bg-brand-600 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg hover:bg-brand-700"
              >
                {loading ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
