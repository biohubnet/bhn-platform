"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ScormPlayerProps {
  courseId: string;
  courseTitle: string;
  packageId: string;
  scormVersion: string;
  entryPoint: string;
  sessionId: string;
  suspendData: string | null;
  location: string | null;
  completionStatus: string;
}

export function ScormPlayer({
  courseId,
  courseTitle,
  scormVersion,
  entryPoint,
  sessionId,
  suspendData,
  location,
  completionStatus,
}: ScormPlayerProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dataRef = useRef<Record<string, string>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveData = useCallback(async (data: Record<string, string>) => {
    const isScorm12 = scormVersion === "SCORM_12";
    const statusKey = isScorm12 ? "cmi.core.lesson_status" : "cmi.completion_status";
    const scoreKey = isScorm12 ? "cmi.core.score.raw" : "cmi.score.raw";
    const scoreMinKey = isScorm12 ? "cmi.core.score.min" : "cmi.score.min";
    const scoreMaxKey = isScorm12 ? "cmi.core.score.max" : "cmi.score.max";
    const timeKey = isScorm12 ? "cmi.core.session_time" : "cmi.session_time";
    const locationKey = isScorm12 ? "cmi.core.lesson_location" : "cmi.location";
    const suspendKey = "cmi.suspend_data";

    const raw = data[scoreKey];
    const score = raw !== undefined ? parseFloat(raw) : undefined;

    await fetch("/api/scorm/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        status: data[statusKey],
        score: isNaN(score as number) ? undefined : score,
        scoreMin: data[scoreMinKey] !== undefined ? parseFloat(data[scoreMinKey]) : undefined,
        scoreMax: data[scoreMaxKey] !== undefined ? parseFloat(data[scoreMaxKey]) : undefined,
        timeSpent: data[timeKey],
        location: data[locationKey],
        suspendData: data[suspendKey],
      }),
    });
  }, [sessionId, scormVersion]);

  useEffect(() => {
    const isScorm12 = scormVersion === "SCORM_12";
    const data = dataRef.current;

    // Initialize data model
    if (suspendData) data["cmi.suspend_data"] = suspendData;
    if (location) {
      data[isScorm12 ? "cmi.core.lesson_location" : "cmi.location"] = location;
    }
    if (completionStatus !== "not attempted") {
      data[isScorm12 ? "cmi.core.lesson_status" : "cmi.completion_status"] = completionStatus;
    }

    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== "SCORM_API") return;
      const { method, element, value } = e.data;

      let result: string = "";

      switch (method) {
        case "Initialize":
        case "LMSInitialize":
          result = "true";
          break;
        case "GetValue":
        case "LMSGetValue":
          result = data[element] ?? "";
          break;
        case "SetValue":
        case "LMSSetValue":
          data[element] = value;
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => saveData({ ...data }), 1000);
          result = "true";
          break;
        case "Commit":
        case "LMSCommit":
          saveData({ ...data });
          result = "true";
          break;
        case "Finish":
        case "LMSFinish":
          // Many SCORM packages (Articulate Storyline, iSpring,
          // Adapt, etc.) call LMSFinish between modules — not just
          // at the end of the course. Auto-redirecting on every
          // Finish was kicking learners back to /courses/[id] when
          // they clicked a module mid-course.
          //
          // Only redirect when the SCORM content reports the course
          // is genuinely done: completed / passed / failed. For
          // anything else (incomplete / not attempted / browsed)
          // just save and stay put — the iframe handles its own
          // internal navigation.
          saveData({ ...data });
          result = "true";
          {
            const status = data[isScorm12 ? "cmi.core.lesson_status" : "cmi.completion_status"];
            if (
              status === "completed" ||
              status === "passed" ||
              status === "failed"
            ) {
              setTimeout(() => router.push(`/courses/${courseId}`), 500);
            }
          }
          break;
        case "GetLastError":
        case "LMSGetLastError":
          result = "0";
          break;
        case "GetErrorString":
        case "LMSGetErrorString":
          result = "";
          break;
        case "GetDiagnostic":
        case "LMSGetDiagnostic":
          result = "";
          break;
      }

      e.source?.postMessage({ type: "SCORM_RESULT", method, result }, { targetOrigin: "*" });
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [scormVersion, suspendData, location, completionStatus, courseId, router, saveData]);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <Link
          href={`/courses/${courseId}`}
          className="flex items-center gap-2 text-subtle hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to course
        </Link>
        <h1 className="text-white text-sm font-medium truncate">{courseTitle}</h1>
        <a
          href={entryPoint}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-subtle hover:text-white text-xs transition-colors"
        >
          <ExternalLink size={14} />
          Open
        </a>
      </div>

      {/* SCORM iframe */}
      <iframe
        ref={iframeRef}
        src={`/scorm-loader.html?src=${encodeURIComponent(entryPoint)}&version=${scormVersion}`}
        className="flex-1 w-full border-0"
        title={courseTitle}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
      />
    </div>
  );
}
