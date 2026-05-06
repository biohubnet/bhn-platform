"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PathwayEnrollButton({ pathwayId }: { pathwayId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function enroll() {
    setLoading(true);
    const res = await fetch(`/api/pathways/${pathwayId}/enroll`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Enrollment failed");
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <Button onClick={enroll} loading={loading} className="bg-card text-brand-700 hover:bg-brand-50">
      Enroll in pathway
    </Button>
  );
}
