"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-card to-brand-100 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Logo size="lg" />
        </Link>

        <div className="bg-card rounded-2xl shadow-xl shadow-brand-900/5 border border-line p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-fg">Create your account</h1>
            <p className="text-muted text-sm mt-1">Free to get started — 5,000 BHN credits included.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                className="w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                placeholder="At least 8 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md shadow-brand-600/25 text-sm"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 hover:text-brand-700 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
