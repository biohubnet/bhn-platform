"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export function ScormUploadButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState("uploading");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/courses/${courseId}/upload-scorm`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      setState("done");
      setMessage("Package uploaded successfully");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setState("error");
      setMessage(data.error ?? "Upload failed");
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="flex items-center gap-2 text-sm font-medium border border-gray-300 text-muted px-3 py-1.5 rounded-lg hover:bg-elevated disabled:opacity-60 transition-colors"
      >
        <Upload size={14} />
        {state === "uploading" ? "Uploading…" : "Upload SCORM (.zip)"}
      </button>
      {state === "done" && (
        <p className="flex items-center gap-1 text-xs text-green-600 mt-1.5">
          <CheckCircle size={12} /> {message}
        </p>
      )}
      {state === "error" && (
        <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
          <AlertCircle size={12} /> {message}
        </p>
      )}
    </div>
  );
}
