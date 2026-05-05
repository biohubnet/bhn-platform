"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeButton({ certId, revoked }: { certId: string; revoked: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!confirm(revoked ? "Reinstate this certificate?" : "Revoke this certificate?")) return;
    setLoading(true);
    await fetch(`/api/admin/certificates/${certId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke: !revoked }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded border ${
        revoked
          ? "border-green-200 text-green-700 hover:bg-green-50"
          : "border-red-200 text-red-600 hover:bg-red-50"
      }`}
    >
      {revoked ? "Reinstate" : "Revoke"}
    </button>
  );
}
