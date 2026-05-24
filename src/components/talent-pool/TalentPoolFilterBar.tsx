"use client";

import { Search, Filter } from "lucide-react";

interface TalentPoolFilterBarProps {
  q: string;
  skills: string;
  stage: string;
  available: boolean;
}

const STAGE_OPTIONS = [
  { value: "", label: "Any stage" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview_scheduled", label: "Interview scheduled" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "passed", label: "Passed" },
];

export function TalentPoolFilterBar({ q, skills, stage, available }: TalentPoolFilterBarProps) {
  return (
    <form
      action="/talent-pool"
      method="get"
      className="rounded-2xl border border-line bg-card p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        {/* Text search */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1">
            Search
          </label>
          <div className="relative">
            <Search
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name or email…"
              className="w-full bg-elevated border border-line rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </div>

        {/* Skills filter */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1">
            Skills
          </label>
          <input
            type="text"
            name="skills"
            defaultValue={skills}
            placeholder="e.g. Python, PCR, CRISPR"
            className="w-full bg-elevated border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        {/* Stage dropdown */}
        <div className="min-w-[160px]">
          <label className="block text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1">
            Pipeline stage
          </label>
          <select
            name="stage"
            defaultValue={stage}
            className="w-full bg-elevated border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none cursor-pointer"
          >
            {STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Available only checkbox */}
        <div className="flex items-center gap-2 pb-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-fg select-none">
            <input
              type="checkbox"
              name="available"
              value="true"
              defaultChecked={available}
              className="w-4 h-4 rounded border-line accent-brand-600 cursor-pointer"
            />
            <span className="font-medium">Available only</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white text-sm font-bold px-4 py-2 hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20"
        >
          <Filter size={13} />
          Filter
        </button>
      </div>
    </form>
  );
}
