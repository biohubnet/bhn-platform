"use client";

import { useState } from "react";
import { DEFAULT_COURSE_COVER, getCourseCoverSources } from "@/lib/courses/cover";

interface CourseCoverProps {
  thumbnail?: string | null;
  code?: string | null;
  className?: string;
  loading?: "eager" | "lazy";
}

/** Decorative artwork: the adjacent course heading supplies its accessible name. */
export function CourseCover({
  thumbnail, code, className, loading = "lazy",
}: CourseCoverProps) {
  const sources = getCourseCoverSources({ thumbnail, code });
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const source = sources.find((candidate) => !failedSources.includes(candidate))
    ?? DEFAULT_COURSE_COVER;

  return (
    // Existing stored URLs may be external; keep native image compatibility.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt=""
      width={1400}
      height={400}
      loading={loading}
      decoding="async"
      className={className}
      onError={() => {
        // Each failed URL is recorded once, including the final fallback.
        // A missing fallback must not trigger a repeating error/update loop.
        setFailedSources((previous) => previous.includes(source)
          ? previous
          : [...previous, source]);
      }}
    />
  );
}
