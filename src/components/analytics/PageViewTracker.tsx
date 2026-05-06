"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/track";

/**
 * Fires a page_view on every Next.js navigation. Mounted once at the root.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const url = pathname + (search?.toString() ? `?${search.toString()}` : "");
    if (url === lastPath.current) return;
    lastPath.current = url;
    track("page_view", { path: pathname });
  }, [pathname, search]);

  return null;
}
