"use client";

/**
 * A link to a trainee's resume file or video introduction that also tells
 * us an employer opened it, for the "Profile views" figures on the
 * trainee's dashboard.
 *
 * The files sit on public R2 URLs, so there is no server hop to count.
 * This fires a keepalive POST as the click happens and lets the
 * navigation carry on; the server ignores anyone who is not an employer,
 * and keeps one row per viewer, trainee, surface and day.
 */
import type { ReactNode } from "react";

export function TrackedMaterialLink({
  href, userId, surface, className, title, children,
}: {
  href: string;
  /** The trainee whose material this is. */
  userId: string;
  surface: "resume_file" | "video_intro";
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      onClick={() => {
        void fetch("/api/profile-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, surface }),
          keepalive: true,
        }).catch(() => undefined);
      }}
    >
      {children}
    </a>
  );
}
