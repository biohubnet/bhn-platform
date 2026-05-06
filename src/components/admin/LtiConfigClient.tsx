"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LtiConfig {
  id: string;
  name: string;
  issuer: string;
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
  deploymentId: string;
  active: boolean;
  createdAt: Date;
}

const EMPTY_FORM = {
  name: "", issuer: "", clientId: "", authEndpoint: "",
  tokenEndpoint: "", jwksEndpoint: "", deploymentId: "", active: true,
};

export function LtiConfigClient({ configs: initial }: { configs: LtiConfig[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/lti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShow(false);
    setForm({ ...EMPTY_FORM });
    router.refresh();
    setLoading(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/lti/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Delete this LTI config?")) return;
    await fetch(`/api/admin/lti/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const fields = [
    { key: "issuer", label: "Issuer URL" },
    { key: "clientId", label: "Client ID" },
    { key: "authEndpoint", label: "Auth Endpoint" },
    { key: "tokenEndpoint", label: "Token Endpoint" },
    { key: "jwksEndpoint", label: "JWKS Endpoint" },
    { key: "deploymentId", label: "Deployment ID" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShow(true)}
          className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700"
        >
          + Add LTI Platform
        </button>
      </div>

      <div className="space-y-3">
        {initial.map((cfg) => (
          <div key={cfg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === cfg.id ? null : cfg.id)}
            >
              <div className="flex items-center gap-3">
                <ChevronDown size={16} className={cn("text-gray-400 transition-transform", expanded !== cfg.id && "-rotate-90")} />
                <div>
                  <p className="font-semibold text-gray-900">{cfg.name}</p>
                  <p className="text-xs text-gray-400">{cfg.issuer}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  cfg.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                )}>
                  {cfg.active ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(cfg.id, cfg.active); }}
                  className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                >
                  {cfg.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); del(cfg.id); }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {expanded === cfg.id && (
              <div className="border-t border-gray-100 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {fields.map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <p className="font-mono text-xs text-gray-700 break-all">
                      {(cfg as unknown as Record<string, string>)[f.key]}
                    </p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Added</p>
                  <p className="text-xs text-gray-500">{new Date(cfg.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {initial.length === 0 && (
          <div className="text-center py-12 text-gray-400">No LTI platforms configured.</div>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add LTI 1.3 Platform</h3>
            <form onSubmit={create} className="space-y-3">
              <input
                placeholder="Platform name *"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              {fields.map((f) => (
                <input
                  key={f.key}
                  placeholder={`${f.label} *`}
                  required
                  value={(form as Record<string, string | boolean>)[f.key] as string}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set("active", e.target.checked)}
                  className="rounded"
                />
                Active immediately
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium"
                >
                  {loading ? "Saving…" : "Add Platform"}
                </button>
                <button type="button" onClick={() => setShow(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
