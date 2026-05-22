"use client";
import { useState } from "react";
import { Columns2, RotateCw, ExternalLink, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Preset {
  id: string;
  label: string;
  description: string;
  left: { title: string; href: string };
  right: { title: string; href: string };
}

/** Curated pairs of pages worth seeing together. */
const PRESETS: Preset[] = [
  {
    id: "applicants",
    label: "Talent pipeline",
    description: "What a trainee submits, vs what HR sees on the partner portal.",
    left:  { title: "Trainee · Talent application", href: "/forms/talent-application" },
    right: { title: "HR · Talent pool",             href: "/talent-pool" },
  },
  {
    id: "internships",
    label: "Internship board",
    description: "Trainee browse vs HR posting management.",
    left:  { title: "Trainee · Internship board",   href: "/internships" },
    right: { title: "HR · Postings workspace",      href: "/employer/postings" },
  },
  {
    id: "courses",
    label: "Course catalog",
    description: "Catalog as a trainee sees it vs the admin queue for pending enrolments.",
    left:  { title: "Trainee · Course catalog",     href: "/courses" },
    right: { title: "Admin · Enrolment requests",   href: "/admin/enrollments" },
  },
  {
    id: "events",
    label: "Events",
    description: "Public event landing vs the admin registrations queue.",
    left:  { title: "Public · Event landing",       href: "/events" },
    right: { title: "Admin · Events queue",         href: "/admin/events" },
  },
];

/**
 * Two-pane iframe view + per-pane URL controls. Each pane:
 *   • Title strip (current title, refresh, open-in-new-tab)
 *   • Path input — admin can type any platform route
 *   • Iframe filling the rest of the column
 *
 * Both iframes load same-origin so they share the admin's session
 * cookie. Switching View-as via the sidebar before / while the page
 * is open re-roles both panes (the iframes refresh with the new
 * acting role on the next router refresh). Swap button mirrors the
 * two panes.
 */
export function SplitViewClient() {
  const [left, setLeft]   = useState<{ title: string; path: string }>({ title: "Trainee · Talent application", path: "/forms/talent-application" });
  const [right, setRight] = useState<{ title: string; path: string }>({ title: "HR · Talent pool",             path: "/talent-pool" });

  // Iframe versioning — bumping the version forces a refresh by
  // including a no-op cache-busting param. Cleaner than mutating
  // src manually and dealing with double-loads.
  const [leftV, setLeftV]   = useState(0);
  const [rightV, setRightV] = useState(0);

  function applyPreset(p: Preset) {
    setLeft({ title: p.left.title, path: p.left.href });
    setRight({ title: p.right.title, path: p.right.href });
    setLeftV((v) => v + 1);
    setRightV((v) => v + 1);
  }

  function swap() {
    setLeft({ ...right });
    setRight({ ...left });
    setLeftV((v) => v + 1);
    setRightV((v) => v + 1);
  }

  return (
    <div className="space-y-4 -mt-2">
      {/* Preset row */}
      <div className="rounded-2xl border border-line bg-card p-3 surface-shadow flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle pl-1 pr-2">
          Presets
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            title={p.description}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-elevated text-fg hover:bg-raised ring-1 ring-inset ring-line text-xs font-medium transition-colors"
          >
            <Columns2 size={11} />
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={swap}
          title="Swap left and right panes"
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-elevated text-muted hover:text-fg hover:bg-raised ring-1 ring-inset ring-line text-xs font-medium transition-colors"
        >
          <ArrowLeftRight size={11} />
          Swap
        </button>
      </div>

      {/* The two panes */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Pane
          side="left"
          title={left.title}
          path={left.path}
          version={leftV}
          onChange={(path) => setLeft({ ...left, path })}
          onRefresh={() => setLeftV((v) => v + 1)}
        />
        <Pane
          side="right"
          title={right.title}
          path={right.path}
          version={rightV}
          onChange={(path) => setRight({ ...right, path })}
          onRefresh={() => setRightV((v) => v + 1)}
        />
      </div>

      <p className="text-xs text-subtle leading-relaxed">
        Both panes load with your current session cookie. To preview a
        page as a different role (Trainee / Employer / Instructor),
        open the sidebar&apos;s View-as dropdown first — the iframes will
        re-render as that role on the next refresh. Iframes that fight
        being embedded (the login page, anything with X-Frame-Options
        DENY) won&apos;t render here; type a logged-in path instead.
      </p>
    </div>
  );
}

function Pane({
  side, title, path, version, onChange, onRefresh,
}: {
  side: "left" | "right";
  title: string;
  path: string;
  version: number;
  onChange: (path: string) => void;
  onRefresh: () => void;
}) {
  // Bust iframe cache with the version counter without mutating the
  // user's path text. `?` vs `&` matters when the path already has
  // its own query string.
  const sep = path.includes("?") ? "&" : "?";
  const src = `${path}${sep}_v=${version}`;

  return (
    <div className={cn(
      "rounded-2xl border border-line bg-card surface-shadow overflow-hidden flex flex-col",
      "min-h-[640px]",
    )}>
      {/* Title strip + actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-elevated/40">
        <span className={cn(
          "text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset",
          side === "left"
            ? "bg-brand-50 text-brand-700 ring-brand-200"
            : "bg-amber-50 text-amber-800 ring-amber-200",
        )}>
          {side === "left" ? "Left" : "Right"}
        </span>
        <h3 className="text-sm font-semibold text-fg flex-1 truncate">
          {title}
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
          title="Refresh this pane"
          aria-label="Refresh"
        >
          <RotateCw size={12} />
        </button>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
          title="Open in a new tab"
          aria-label="Open in new tab"
        >
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Path input */}
      <div className="px-3 py-2 border-b border-line bg-elevated/20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRefresh();
          }}
        >
          <input
            type="text"
            value={path}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/some/path"
            spellCheck={false}
            className="w-full text-xs font-mono bg-card border border-line rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/60"
          />
        </form>
      </div>

      {/* Iframe — flex-1 to fill */}
      <iframe
        key={src}
        src={src}
        title={title}
        className="flex-1 w-full bg-bg"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
}
