"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SettingDef {
  label: string;
  description: string;
  default: string;
  type: string;
}

export function SettingsForm({
  defaults,
  values,
}: {
  defaults: Record<string, SettingDef>;
  values: Record<string, string>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of Object.keys(defaults)) {
      init[key] = values[key] ?? defaults[key].default;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {Object.entries(defaults).map(([key, def]) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-900 mb-0.5">{def.label}</label>
              <p className="text-xs text-gray-400 mb-3">{def.description}</p>
              {def.type === "boolean" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key] === "true"}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked ? "true" : "false" }))}
                    className="rounded w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{form[key] === "true" ? "Enabled" : "Disabled"}</span>
                </label>
              ) : (
                <input
                  type={def.type}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>
            <span className="text-xs text-gray-400 mt-1 shrink-0 font-mono">{key}</span>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </form>
  );
}
