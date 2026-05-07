"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseFilterOptions {
  topic: string[];
  delivery: string[];
  provider: string[];
}

export function CourseFilters({ options }: { options: CourseFilterOptions }) {
  const router = useRouter();
  const sp = useSearchParams();

  const selected = useMemo(
    () => ({
      topic:    (sp.get("topic")    ?? "").split(",").filter(Boolean),
      delivery: (sp.get("delivery") ?? "").split(",").filter(Boolean),
      provider: (sp.get("provider") ?? "").split(",").filter(Boolean),
      special:  sp.get("special") === "1",
    }),
    [sp]
  );

  function setParam(key: string, values: string[]) {
    const next = new URLSearchParams(sp.toString());
    if (values.length === 0) next.delete(key);
    else next.set(key, values.join(","));
    router.push(`/courses?${next.toString()}`);
  }

  function toggle(key: "topic" | "delivery" | "provider", value: string) {
    const cur = new Set(selected[key]);
    if (cur.has(value)) cur.delete(value);
    else cur.add(value);
    setParam(key, Array.from(cur));
  }

  function toggleSpecial() {
    const next = new URLSearchParams(sp.toString());
    if (selected.special) next.delete("special");
    else next.set("special", "1");
    router.push(`/courses?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams(sp.toString());
    next.delete("topic");
    next.delete("delivery");
    next.delete("provider");
    next.delete("special");
    router.push(`/courses?${next.toString()}`);
  }

  const totalActive =
    selected.topic.length + selected.delivery.length + selected.provider.length + (selected.special ? 1 : 0);

  return (
    <aside className="bg-card border border-line rounded-2xl p-4 space-y-1 sticky top-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-semibold text-fg">Filter courses</h2>
        {totalActive > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-brand-700 hover:underline inline-flex items-center gap-1"
          >
            <X size={11} /> Clear ({totalActive})
          </button>
        )}
      </div>

      <Group title="On-demand course topics" defaultOpen={selected.topic.length > 0}>
        {options.topic.map((t) => (
          <Check
            key={t}
            label={t}
            checked={selected.topic.includes(t)}
            onChange={() => toggle("topic", t)}
          />
        ))}
      </Group>

      <Group title="Delivery" defaultOpen={selected.delivery.length > 0}>
        {options.delivery.map((d) => (
          <Check
            key={d}
            label={d}
            checked={selected.delivery.includes(d)}
            onChange={() => toggle("delivery", d)}
          />
        ))}
      </Group>

      <Group title="Special programs & workshops" defaultOpen={selected.special}>
        <Check
          label="Special Programs (Instructor-led)"
          checked={selected.special}
          onChange={toggleSpecial}
        />
      </Group>

      <Group title="Provider" defaultOpen={selected.provider.length > 0}>
        {options.provider.map((p) => (
          <Check
            key={p}
            label={p}
            checked={selected.provider.includes(p)}
            onChange={() => toggle("provider", p)}
          />
        ))}
      </Group>
    </aside>
  );
}

function Group({
  title, defaultOpen = false, children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-line first:border-t-0 py-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-1.5 py-2 text-left rounded-md hover:bg-elevated transition-colors"
      >
        <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle">
          {title}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "text-subtle transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="space-y-0.5 pl-1 pb-1">{children}</div>}
    </div>
  );
}

function Check({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-elevated cursor-pointer text-sm leading-tight">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-brand-600"
      />
      <span className={cn("text-fg", checked && "font-medium text-brand-700")}>{label}</span>
    </label>
  );
}
