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
  /** Learner identity, passed through to the SCORM loader so packages
   *  that read cmi.core.student_name / cmi.learner_name on init get a
   *  real value instead of an empty string (which is what crashes
   *  Articulate Storyline + iSpring + Captivate at boot). */
  learnerId?: string | null;
  learnerName?: string | null;
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
  learnerId,
  learnerName,
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

    // (Re-)initialize the data model from server-side values. This
    // runs every time the parent re-renders with new
    // suspendData / location / completionStatus, not just on mount —
    // otherwise re-entering a course (or a router.refresh after a
    // background save) would leave the iframe API serving stale local
    // values until the SCORM package issued its first SetValue.
    //
    // We keep any keys the iframe has set since last sync (so a typed
    // bookmark or a partially-answered question isn't wiped) and only
    // overwrite the canonical server-tracked keys.
    if (suspendData != null) data["cmi.suspend_data"] = suspendData;
    if (location != null) {
      data[isScorm12 ? "cmi.core.lesson_location" : "cmi.location"] = location;
    }
    if (completionStatus !== "not attempted") {
      data[isScorm12 ? "cmi.core.lesson_status" : "cmi.completion_status"] = completionStatus;
    }

    // Persistence-only message handler. As of this commit, the loader
    // serves GetValue / LMSGetValue synchronously out of its own
    // (URL-param-seeded) cache, so the parent no longer fields read
    // requests — it only receives write pings (SetValue / Commit /
    // Finish) and persists them. We still ack with a SCORM_RESULT for
    // backward compatibility with the previous loader's async flow,
    // but new loaders ignore the ack.
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== "SCORM_API") return;
      const { method, element, value } = e.data;

      let result: string = "true";

      switch (method) {
        case "Initialize":
        case "LMSInitialize":
        case "GetLastError":
        case "LMSGetLastError":
        case "GetErrorString":
        case "LMSGetErrorString":
        case "GetDiagnostic":
        case "LMSGetDiagnostic":
          // No-op — loader handles these locally now. Old loaders
          // that still send these get a valid ack.
          break;
        case "GetValue":
        case "LMSGetValue":
          // Old-loader path. New loader serves these locally; this
          // arm stays for backward compatibility with any cached
          // /scorm-loader.html still running.
          result = data[element] ?? "";
          break;
        case "SetValue":
        case "LMSSetValue":
          data[element] = value;
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => saveData({ ...data }), 1000);
          break;
        case "Commit":
        case "LMSCommit":
          saveData({ ...data });
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
          //
          // Crucially: AWAIT the final save before redirecting. The
          // earlier `setTimeout(..., 500)` was racing the PATCH and
          // could navigate away while the last writes were still in
          // flight — losing the trainee's last few seconds of
          // progress on slow networks.
          {
            const finalSnapshot = { ...data };
            const status = finalSnapshot[isScorm12 ? "cmi.core.lesson_status" : "cmi.completion_status"];
            const shouldExit =
              status === "completed" ||
              status === "passed" ||
              status === "failed";
            // Fire-and-forget for the non-exit case (matches Commit);
            // await for the exit case so the navigation doesn't race.
            if (shouldExit) {
              void saveData(finalSnapshot).then(() => {
                router.push(`/courses/${courseId}`);
              });
            } else {
              saveData(finalSnapshot);
            }
          }
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

  // Build the loader URL — pass everything the SCORM content might
  // ask for via LMSGetValue on init, so the loader can serve those
  // reads synchronously without a postMessage round-trip. Without
  // this, packages that read cmi.core.student_name / cmi.launch_data /
  // etc. on boot got "" from the bridge and many of them silently
  // aborted their init — presenting as "courses are not launching".
  //
  // The `v=<COMMIT_SHA>` param is a cache-buster: any browser that
  // cached the OLD scorm-loader.html (back when the global X-Frame-
  // Options was DENY) would otherwise reuse that cached response and
  // continue showing "refused to connect" even after the server-side
  // SAMEORIGIN fix shipped. Different URL = different cache key =
  // forced refetch. We pair this with `Cache-Control: no-store` on
  // /scorm-loader.html in next.config.ts so the response itself is
  // also un-cacheable going forward.
  const loaderUrl = (() => {
    const qs = new URLSearchParams();
    qs.set("src", entryPoint);
    qs.set("version", scormVersion);
    if (suspendData) qs.set("suspendData", suspendData);
    if (location) qs.set("location", location);
    qs.set("completionStatus", completionStatus);
    if (learnerId) qs.set("learnerId", learnerId);
    if (learnerName) qs.set("learnerName", learnerName);
    const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA;
    if (commitSha) qs.set("v", commitSha);
    return `/scorm-loader.html?${qs.toString()}`;
  })();

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

      {/* SCORM iframe.
       *
       * `allow-top-navigation` is deliberately OMITTED. Many SCORM
       * packages have "exit" / "prev module" buttons that fire
       * window.top.history.back() or parent.location = ... — wired
       * by authors who assume the package launches in a popup,
       * not iframed inside an LMS. With top-navigation allowed,
       * those calls yank the LMS page back, which looks like
       * "clicking a module returns me to the previous page".
       *
       * Without it, the iframe can't navigate the parent. Module
       * navigation is handled by the SCORM content internally
       * (it's a self-contained subapp) and the LMS Back button
       * in the top bar covers exit. */}
      <iframe
        ref={iframeRef}
        src={loaderUrl}
        className="flex-1 w-full border-0"
        title={courseTitle}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
