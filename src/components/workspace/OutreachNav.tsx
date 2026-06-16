"use client";

/**
 * In-page sub-nav for the Outreach area — two pages, Contacts and Campaigns,
 * mirrored as sub-items under the Outreach tab in the sidebar. Sits below the
 * PageHero on both pages so they read as one tool with two views.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookUser, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "contacts", label: "Contacts", href: "/admin/workspace/outreach/contacts", icon: BookUser },
  { key: "campaigns", label: "Campaigns", href: "/admin/workspace/outreach/campaigns", icon: Megaphone },
] as const;

export function OutreachNav() {
  const pathname = usePathname();
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-elevated/60 p-1">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors",
              active ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
            )}
          >
            <Icon size={13} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
