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
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="text-xs border border-line rounded px-2 py-1 bg-card disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-brand-400"
    >
      <option value="trainee">Trainee</option>
      <option value="evaluating">Evaluating</option>
      <option value="instructor">Instructor</option>
      <option value="admin">Admin</option>
      <option value="superadmin">Superadmin</option>
    </select>
  );
}
