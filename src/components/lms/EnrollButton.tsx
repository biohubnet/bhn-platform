"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function enroll() {
    setLoading(true);
    await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={enroll}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
    >
      {loading ? "Enrolling…" : "Enroll Now"}
    </button>
  );
}
