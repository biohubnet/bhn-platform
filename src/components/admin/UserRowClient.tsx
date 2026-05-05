"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["user", "evaluating", "admin", "superadmin"];

interface UserData {
  id: string;
  name: string | null;
  role: string;
  isActive: boolean;
  credits: number;
}

export function UserRowClient({ user }: { user: UserData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function patch(data: Record<string, unknown>) {
    setLoading(true);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
    setLoading(false);
  }

  async function grantCredits() {
    const amtStr = prompt("Grant credits (enter amount):");
    const amt = parseFloat(amtStr ?? "");
    if (isNaN(amt) || amt <= 0) return;
    setLoading(true);
    await fetch("/api/admin/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, amount: amt }),
    });
    router.refresh();
    setLoading(false);
  }

  async function resetPassword() {
    const pw = prompt("New password:");
    if (!pw || pw.length < 6) return alert("Password must be at least 6 characters.");
    await patch({ password: pw });
    alert("Password updated.");
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <select
        value={user.role}
        disabled={loading}
        onChange={(e) => patch({ role: e.target.value })}
        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button
        onClick={() => patch({ isActive: !user.isActive })}
        disabled={loading}
        className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
      >
        {user.isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={grantCredits}
        disabled={loading}
        className="text-xs px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50"
      >
        +Credits
      </button>
      <button
        onClick={resetPassword}
        disabled={loading}
        className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
      >
        Reset PW
      </button>
    </div>
  );
}
