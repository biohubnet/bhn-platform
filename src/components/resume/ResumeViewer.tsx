"use client";

/**
 * Read-only resume viewer with per-bullet (and per-item / per-section)
 * comment composer. Rendered on /resume/[userId] for mentors,
 * instructors, admins, industrial mentors, and qualifying employers.
 *
 * The viewer never mutates Resume.content — only the owner can do
 * that via /profile/resume. The only writes from this surface are
 * comments (create + status updates).
 *
 * Layout: read-only tree of sections → items → bullets. Each bullet
 * carries an inline thread that opens on click; if the viewer has
 * comment permission, a textarea + Send button sits at the bottom of
 * the thread. Resume-wide and section-wide comments live in a
 * collapsible drawer at the top of each section.
 */

import { useMemo, useState, useTransition } from "react";
import {
  MessageCircle, Send, CheckCircle2, RotateCcw, X, ChevronDown, ChevronUp, Plus,
} from "lucide-react";
import type { ResumeContent, ResumeBullet, ResumeItem, ResumeSection } from "@/lib/resume/types";
import { SECTION_LABEL } from "@/lib/resume/types";

interface CommentRow {
  id: string;
  authorId: string;
  authorRole: string;
  authorName: string | null;
  authorEmail: string | null;
  body: string;
  status: "open" | "resolved" | "applied";
  anchorBulletId: string | null;
  anchorItemId: string | null;
  anchorSectionId: string | null;
  createdAt: string;
}

interface Props {
  ownerId: string;
  content: ResumeContent;
  initialComments: CommentRow[];
  canComment: boolean;
  viewerId: string;
  viewerRole: string;
}

export function ResumeViewer({
  ownerId, content, initialComments, canComment, viewerId, viewerRole,
}: Props) {
  const [comments, setComments] = useState<CommentRow[]>(initialComments);

  // Group comments by anchor for cheap lookup during render. A bullet
  // anchor wins over an item anchor wins over a section anchor — the
  // tree itself dictates where each comment renders.
  const byBullet = useMemo(() => groupBy(comments.filter((c) => c.anchorBulletId), "anchorBulletId"), [comments]);
  const byItem    = useMemo(() => groupBy(comments.filter((c) => !c.anchorBulletId && c.anchorItemId), "anchorItemId"), [comments]);
  const bySection = useMemo(() => groupBy(comments.filter((c) => !c.anchorBulletId && !c.anchorItemId && c.anchorSectionId), "anchorSectionId"), [comments]);
  const resumeWide = useMemo(() => comments.filter((c) => !c.anchorBulletId && !c.anchorItemId && !c.anchorSectionId), [comments]);

  async function createComment(args: {
    body: string;
    anchorBulletId?: string;
    anchorItemId?: string;
    anchorSectionId?: string;
  }): Promise<CommentRow | null> {
    const res = await fetch(`/api/resume/${ownerId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; comment?: CommentRowApi };
    if (!res.ok || !j.ok || !j.comment) return null;
    const row: CommentRow = apiToRow(j.comment);
    setComments((prev) => [...prev, row]);
    return row;
  }

  async function updateCommentStatus(id: string, status: "open" | "resolved" | "applied") {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    const res = await fetch(`/api/resume/${ownerId}/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      // Roll back optimistic change on failure.
      const prev = initialComments.find((c) => c.id === id)?.status ?? "open";
      setComments((c) => c.map((x) => (x.id === id ? { ...x, status: prev } : x)));
    }
  }

  return (
    <div className="space-y-4">
      {/* Resume-wide comments + composer ------------------------------ */}
      <ResumeWideThread
        comments={resumeWide}
        canComment={canComment}
        onCreate={(body) => createComment({ body })}
        onStatus={updateCommentStatus}
      />

      {/* Header block (read-only summary) ----------------------------- */}
      {content.header && (
        <HeaderBlock header={content.header} />
      )}

      {/* Sections ---------------------------------------------------- */}
      {content.sections.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card-solid p-6 text-sm text-fg-muted text-center">
          The trainee hasn&apos;t added any sections yet. Drop a comment above and they&apos;ll see it on first visit.
        </div>
      ) : (
        content.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            sectionComments={bySection.get(section.id) ?? []}
            itemComments={byItem}
            bulletComments={byBullet}
            canComment={canComment}
            onCreate={createComment}
            onStatus={updateCommentStatus}
          />
        ))
      )}

      {!canComment && (
        <p className="text-[11px] text-fg-subtle text-center mt-6">
          You can view this resume but not comment on it. Ask an admin if you need comment access.
        </p>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

interface CommentRowApi {
  id: string;
  authorId: string;
  authorRole: string;
  body: string;
  status: string;
  anchorBulletId: string | null;
  anchorItemId: string | null;
  anchorSectionId: string | null;
  createdAt: string;
  author?: { id: string; name: string | null; email: string | null; role: string };
}
function apiToRow(c: CommentRowApi): CommentRow {
  return {
    id: c.id,
    authorId: c.authorId,
    authorRole: c.authorRole,
    authorName: c.author?.name ?? null,
    authorEmail: c.author?.email ?? null,
    body: c.body,
    status: (c.status as "open" | "resolved" | "applied") ?? "open",
    anchorBulletId: c.anchorBulletId,
    anchorItemId: c.anchorItemId,
    anchorSectionId: c.anchorSectionId,
    createdAt: c.createdAt,
  };
}

function groupBy<T>(rows: T[], key: keyof T) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = r[key] as unknown as string | null;
    if (!k) continue;
    const list = m.get(k) ?? [];
    list.push(r);
    m.set(k, list);
  }
  return m;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function roleLabel(role: string) {
  switch (role) {
    case "industrial_mentor": return "Mentor";
    case "instructor":        return "Instructor";
    case "admin":             return "Admin";
    case "superadmin":        return "Admin";
    case "employer":          return "Employer";
    default:                  return "User";
  }
}

// ── Atoms ────────────────────────────────────────────────────────

function HeaderBlock({ header }: { header: NonNullable<ResumeContent["header"]> }) {
  const hasContact = header.name || header.email || header.phone || header.location;
  if (!hasContact && !header.summary) return null;
  return (
    <div className="rounded-2xl border border-line bg-card-solid p-5">
      {hasContact && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {header.name && <h2 className="text-lg font-semibold text-fg">{header.name}</h2>}
          {header.email && <span className="text-xs text-fg-muted">{header.email}</span>}
          {header.phone && <span className="text-xs text-fg-muted">{header.phone}</span>}
          {header.location && <span className="text-xs text-fg-muted">{header.location}</span>}
        </div>
      )}
      {header.summary && (
        <p className="mt-2 text-sm text-fg leading-relaxed">{header.summary}</p>
      )}
    </div>
  );
}

function SectionBlock(props: {
  section: ResumeSection;
  sectionComments: CommentRow[];
  itemComments: Map<string, CommentRow[]>;
  bulletComments: Map<string, CommentRow[]>;
  canComment: boolean;
  onCreate: (args: { body: string; anchorBulletId?: string; anchorItemId?: string; anchorSectionId?: string }) => Promise<CommentRow | null>;
  onStatus: (id: string, status: "open" | "resolved" | "applied") => void;
}) {
  const { section } = props;
  const heading = section.title ?? SECTION_LABEL[section.kind];
  const [showSectionComposer, setShowSectionComposer] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-card-solid p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg tracking-tight">{heading}</h3>
        {props.canComment && (
          <button
            type="button"
            onClick={() => setShowSectionComposer((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-fg-muted hover:text-fg"
          >
            <Plus size={12} /> Section comment
          </button>
        )}
      </div>

      {/* Section-wide thread */}
      {(props.sectionComments.length > 0 || showSectionComposer) && (
        <div className="rounded-lg bg-bg/40 ring-1 ring-line/60 p-3 space-y-2">
          {props.sectionComments.map((c) => (
            <CommentRowView key={c.id} c={c} onStatus={props.onStatus} canManage={props.canComment} />
          ))}
          {showSectionComposer && props.canComment && (
            <Composer
              placeholder="Comment on this whole section…"
              onSubmit={async (body) => {
                const r = await props.onCreate({ body, anchorSectionId: section.id });
                if (r) setShowSectionComposer(false);
                return !!r;
              }}
              onCancel={() => setShowSectionComposer(false)}
            />
          )}
        </div>
      )}

      {/* Items */}
      {section.items.length === 0 ? (
        <p className="text-xs text-fg-subtle italic">No items yet.</p>
      ) : (
        section.items.map((item) => (
          <ItemBlock
            key={item.id}
            item={item}
            itemComments={props.itemComments.get(item.id) ?? []}
            bulletComments={props.bulletComments}
            canComment={props.canComment}
            onCreate={props.onCreate}
            onStatus={props.onStatus}
          />
        ))
      )}
    </div>
  );
}

function ItemBlock(props: {
  item: ResumeItem;
  itemComments: CommentRow[];
  bulletComments: Map<string, CommentRow[]>;
  canComment: boolean;
  onCreate: (args: { body: string; anchorBulletId?: string; anchorItemId?: string; anchorSectionId?: string }) => Promise<CommentRow | null>;
  onStatus: (id: string, status: "open" | "resolved" | "applied") => void;
}) {
  const { item } = props;
  const [showItemComposer, setShowItemComposer] = useState(false);
  const headerLine = [item.title, item.subtitle].filter(Boolean).join(" — ");

  if (!headerLine && item.bullets.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {(headerLine || item.dateRange) && (
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-medium text-fg">{headerLine || <em className="text-fg-subtle">Untitled</em>}</div>
          {item.dateRange && <div className="text-[11px] text-fg-muted shrink-0">{item.dateRange}</div>}
        </div>
      )}
      {item.bullets.length > 0 && (
        <ul className="space-y-1.5 ml-1">
          {item.bullets.map((b) => (
            <BulletRow
              key={b.id}
              bullet={b}
              comments={props.bulletComments.get(b.id) ?? []}
              canComment={props.canComment}
              onCreate={(body) => props.onCreate({
                body,
                anchorBulletId:  b.id,
                anchorItemId:    item.id,
              })}
              onStatus={props.onStatus}
            />
          ))}
        </ul>
      )}
      {props.canComment && (
        <button
          type="button"
          onClick={() => setShowItemComposer((v) => !v)}
          className="text-[11px] text-fg-subtle hover:text-fg inline-flex items-center gap-1"
        >
          <Plus size={11} /> Item comment
        </button>
      )}
      {(props.itemComments.length > 0 || showItemComposer) && (
        <div className="ml-3 mt-1 pl-3 border-l-2 border-amber-200/70 space-y-2">
          {props.itemComments.map((c) => (
            <CommentRowView key={c.id} c={c} onStatus={props.onStatus} canManage={props.canComment} />
          ))}
          {showItemComposer && props.canComment && (
            <Composer
              placeholder="Comment on this item (job / school / project)…"
              onSubmit={async (body) => {
                const r = await props.onCreate({ body, anchorItemId: item.id });
                if (r) setShowItemComposer(false);
                return !!r;
              }}
              onCancel={() => setShowItemComposer(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function BulletRow(props: {
  bullet: ResumeBullet;
  comments: CommentRow[];
  canComment: boolean;
  onCreate: (body: string) => Promise<CommentRow | null>;
  onStatus: (id: string, status: "open" | "resolved" | "applied") => void;
}) {
  const { bullet, comments, canComment } = props;
  const openCount = comments.filter((c) => c.status === "open").length;
  const [expanded, setExpanded] = useState(comments.length > 0);
  return (
    <li className="group">
      <div className="flex items-start gap-2">
        <span className="mt-2 w-1 h-1 rounded-full bg-fg-subtle shrink-0" />
        <p className="text-sm text-fg leading-relaxed flex-1">{bullet.body}</p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`shrink-0 mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
            openCount > 0
              ? "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
              : "text-fg-subtle hover:text-fg hover:bg-bg/50"
          }`}
          title={comments.length === 0 ? "Add comment" : `${comments.length} comment(s), ${openCount} open`}
        >
          <MessageCircle size={11} />
          {comments.length > 0 ? comments.length : ""}
        </button>
      </div>
      {expanded && (
        <div className="ml-3 mt-1.5 pl-3 border-l-2 border-amber-200/70 space-y-2">
          {comments.length === 0 && !canComment && (
            <p className="text-[11px] text-fg-subtle italic">No comments on this bullet yet.</p>
          )}
          {comments.map((c) => (
            <CommentRowView key={c.id} c={c} onStatus={props.onStatus} canManage={canComment} />
          ))}
          {canComment && (
            <Composer
              placeholder="Comment on this bullet…"
              onSubmit={async (body) => {
                const r = await props.onCreate(body);
                return !!r;
              }}
            />
          )}
        </div>
      )}
    </li>
  );
}

function ResumeWideThread(props: {
  comments: CommentRow[];
  canComment: boolean;
  onCreate: (body: string) => Promise<CommentRow | null>;
  onStatus: (id: string, status: "open" | "resolved" | "applied") => void;
}) {
  const [open, setOpen] = useState(props.comments.length > 0);
  return (
    <div className="rounded-xl border border-dashed border-line bg-bg/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-[11px] uppercase tracking-[0.16em] font-semibold text-fg-muted hover:text-fg"
      >
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle size={12} /> Resume-wide notes
          {props.comments.length > 0 && (
            <span className="text-fg-subtle normal-case">({props.comments.length})</span>
          )}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {props.comments.length === 0 && !props.canComment && (
            <p className="text-xs text-fg-subtle italic">No resume-wide comments yet.</p>
          )}
          {props.comments.map((c) => (
            <CommentRowView key={c.id} c={c} onStatus={props.onStatus} canManage={props.canComment} />
          ))}
          {props.canComment && (
            <Composer
              placeholder="Leave a note on the whole resume…"
              onSubmit={async (body) => {
                const r = await props.onCreate(body);
                return !!r;
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CommentRowView({
  c, onStatus, canManage,
}: {
  c: CommentRow;
  onStatus: (id: string, status: "open" | "resolved" | "applied") => void;
  canManage: boolean;
}) {
  const statusBadge = c.status === "applied"
    ? { label: "Applied",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
    : c.status === "resolved"
    ? { label: "Resolved", cls: "bg-fg/5 text-fg-muted ring-line" }
    : { label: "Open",     cls: "bg-amber-50 text-amber-800 ring-amber-200" };
  return (
    <div className="rounded-lg bg-card-solid ring-1 ring-line p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-fg truncate">
            {c.authorName ?? c.authorEmail ?? "Reviewer"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-fg-subtle">
            {roleLabel(c.authorRole)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ring-1 ring-inset ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
          <span className="text-[10px] text-fg-subtle">{formatDate(c.createdAt)}</span>
        </div>
      </div>
      <p className="mt-1.5 text-fg leading-relaxed whitespace-pre-wrap">{c.body}</p>
      {canManage && (
        <div className="mt-2 flex items-center gap-1.5">
          {c.status !== "resolved" && (
            <button
              type="button"
              onClick={() => onStatus(c.id, "resolved")}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-fg-muted hover:bg-fg/5 transition-colors"
            >
              <CheckCircle2 size={10} /> Mark resolved
            </button>
          )}
          {c.status !== "open" && (
            <button
              type="button"
              onClick={() => onStatus(c.id, "open")}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-fg-muted hover:bg-fg/5 transition-colors"
            >
              <RotateCcw size={10} /> Reopen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Composer({
  placeholder, onSubmit, onCancel,
}: {
  placeholder: string;
  onSubmit: (body: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  function send() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const ok = await onSubmit(trimmed);
      if (ok) setBody("");
    });
  }
  return (
    <div className="space-y-1.5">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full text-xs rounded-lg border border-line bg-bg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-y"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); send(); }
        }}
      />
      <div className="flex items-center justify-end gap-1.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-fg-muted hover:bg-fg/5"
          >
            <X size={11} /> Cancel
          </button>
        )}
        <button
          type="button"
          onClick={send}
          disabled={pending || body.trim().length === 0}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-600 text-white text-[11px] font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Send size={11} /> {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
