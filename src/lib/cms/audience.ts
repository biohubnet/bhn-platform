/**
 * Page audience gating — single source of truth for "which roles
 * can see this page?". Used by the public /p/[slug] route to
 * filter the audience attribute, and by the admin editor to
 * present the audience dropdown.
 */

export const PAGE_AUDIENCES = ["public", "learners", "staff", "admins"] as const;
export type PageAudience = (typeof PAGE_AUDIENCES)[number];

export const PAGE_AUDIENCE_LABEL: Record<PageAudience, string> = {
  public:   "Public (anyone)",
  learners: "Learners (trainee + evaluating)",
  staff:    "Staff (instructor + admin + superadmin)",
  admins:   "Admins (admin + superadmin)",
};

export const PAGE_STATUSES = ["draft", "published"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

/**
 * Decide whether a viewer with `viewerRole` may see a page with
 * `audience`. `viewerRole` is null for unauthenticated viewers
 * (only "public" pages render for them).
 */
export function canViewPage(audience: string, viewerRole: string | null): boolean {
  switch (audience) {
    case "public":
      return true;
    case "learners":
      return (
        viewerRole === "trainee" ||
        viewerRole === "evaluating" ||
        viewerRole === "instructor" ||
        viewerRole === "admin" ||
        viewerRole === "superadmin"
      );
    case "staff":
      return (
        viewerRole === "instructor" ||
        viewerRole === "admin" ||
        viewerRole === "superadmin"
      );
    case "admins":
      return viewerRole === "admin" || viewerRole === "superadmin";
    default:
      // Unknown audience — fail closed.
      return false;
  }
}
