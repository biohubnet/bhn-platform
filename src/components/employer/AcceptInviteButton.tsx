"use client";

/**
 * Client-side button that POSTs to the invite accept endpoint,
 * then redirects to /employer on success. Shown only when the
 * user is already signed in on the invite accept page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Loader2 } from "lucide-react";

interface Props {
  token: string;
}

export function AcceptInviteButton({ token }: Props) {
  const router  = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/employer/invites/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setState("error");
        return;
      }
      router.push("/employer");
    } catch {
      setError("Network error — please try again");
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={accept}
        disabled={state === "loading"}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
      >
        {state === "loading" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <UserCheck size={16} />
        )}
        {state === "loading" ? "Joining…" : "Accept invitation & join workspace"}
      </button>
      {error && (
        <p className="text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
