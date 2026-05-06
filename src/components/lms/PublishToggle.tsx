"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishToggle({ courseId, status }: { courseId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = status === "published" ? "draft" : "published";
    await fetch(`/api/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors disabled:opacity-60 ${
        status === "published"
          ? "border-gray-300 text-muted hover:bg-elevated"
          : "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
      }`}
    >
      {loading ? "…" : status === "published" ? "Unpublish" : "Publish"}
    </button>
  );
}
