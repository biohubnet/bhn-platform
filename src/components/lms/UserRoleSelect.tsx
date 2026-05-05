"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserRoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  async function handleChange(newRole: string) {
    setSaving(true);
    setRole(newRole);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      <option value="learner">Learner</option>
      <option value="instructor">Instructor</option>
      <option value="admin">Admin</option>
    </select>
  );
}
