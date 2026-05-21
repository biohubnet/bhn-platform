"use client";

/**
 * Paper-style mini representation of a structured resume.
 *
 * Used on /profile/resumes so each card visually looks like a
 * document (name at top, section headings with hairline rules,
 * bullets as gray lines). Real text is rendered for the name and
 * section headings + first item titles so users can tell their
 * resumes apart at a glance; everything else is reduced to
 * placeholder strokes — that keeps the thumbnail readable at
 * 144px wide without fighting browser minimum font sizes.
 *
 * Aspect ratio matches US letter (8.5 × 11 ⇒ ~0.773). Sub-pixel
 * borders + a soft shadow give it the "page" feel.
 *
 * The component is purely presentational — no fetches, no state.
 * Pass `content` (the ResumeContent JSON) and an optional explicit
 * width; everything else is derived.
 */

import type { ResumeContent } from "@/lib/resume/types";
import { SECTION_LABEL } from "@/lib/resume/types";
import { FileX } from "lucide-react";

interface Props {
  content: ResumeContent | null;
  /** Width in CSS pixels. Height auto-derives from the letter
   *  aspect ratio. Default 144 fits the /profile/resumes card. */
  width?: number;
  /** "Dim" the thumbnail (archived rows). */
  dimmed?: boolean;
}

export function ResumeThumbnail({ content, width = 144, dimmed }: Props) {
  const h = Math.round(width * (11 / 8.5));
  const isEmpty = !content || !content.sections?.length
    || content.sections.every((s) => s.items.length === 0);

  if (isEmpty) {
    return (
      <div
        className={
          "relative shrink-0 rounded-sm border border-line bg-white shadow-md flex items-center justify-center text-fg-subtle " +
          (dimmed ? "opacity-60 saturate-0" : "")
        }
        style={{ width, height: h }}
      >
        <div className="text-center px-2">
          <FileX size={16} className="mx-auto opacity-50" />
          <p className="text-[8px] uppercase tracking-[0.16em] font-bold mt-1.5">Empty</p>
        </div>
      </div>
    );
  }

  const header = content!.header ?? {};
  // Cap at 4 sections so the thumbnail never overflows. Sections
  // beyond the 4th are dropped from the visual; users see the full
  // resume by clicking through.
  const sections = content!.sections.slice().sort((a, b) => a.position - b.position).slice(0, 4);

  // Available content height = total height minus padding (8px each side)
  // distributed across the rendered sections. Simple budget heuristic
  // — gives roughly even visual weight to each section regardless of
  // how many bullets it has.
  return (
    <div
      className={
        "relative shrink-0 rounded-sm border border-line bg-white shadow-md overflow-hidden " +
        (dimmed ? "opacity-60 saturate-0" : "")
      }
      style={{ width, height: h }}
    >
      <div className="absolute inset-0 p-2 flex flex-col gap-1.5 text-black">
        {/* Header — real name in real type. The contact line is too
            small to render legibly here so we drop it. */}
        {header.name && (
          <p
            className="font-bold leading-tight truncate"
            style={{ fontSize: Math.max(7, Math.round(width * 0.06)) }}
          >
            {header.name}
          </p>
        )}
        {(header.email || header.phone || header.location) && (
          <div
            className="h-[1.5px] bg-gray-300 rounded-full"
            style={{ width: "60%" }}
            aria-hidden
          />
        )}

        {/* Sections */}
        <div className="mt-0.5 flex-1 flex flex-col gap-1.5 overflow-hidden">
          {sections.map((s) => {
            const heading = s.title ?? SECTION_LABEL[s.kind];
            const items = s.items.slice(0, s.kind === "skills" ? 1 : 2);
            return (
              <div key={s.id} className="flex flex-col gap-[2px]">
                <p
                  className="font-semibold uppercase tracking-wider leading-none"
                  style={{
                    fontSize: Math.max(5, Math.round(width * 0.035)),
                    borderBottom: "0.5px solid rgba(0,0,0,0.5)",
                    paddingBottom: 1,
                  }}
                >
                  {heading}
                </p>
                {s.kind === "skills"
                  ? renderSkillsLine(items[0]?.bullets?.length ?? 0, width)
                  : items.map((it) => (
                      <ItemBlock key={it.id} item={it} width={width} />
                    ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Internals ───────────────────────────────────────────────────

function ItemBlock({
  item, width,
}: {
  item: {
    title?: string;
    subtitle?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    bullets: { id: string }[];
  };
  width: number;
}) {
  // Render: title (real text, tiny) + small italic subtitle line
  // (stroke), then bullets as gray lines.
  const titleSize = Math.max(5, Math.round(width * 0.038));
  const bullets = item.bullets.slice(0, 3);
  return (
    <div className="flex flex-col gap-[1.5px]">
      {item.title && (
        <p
          className="font-semibold leading-tight truncate"
          style={{ fontSize: titleSize }}
        >
          {item.title}
        </p>
      )}
      {item.subtitle && (
        <div
          className="h-[1px] bg-gray-300 rounded-full"
          style={{ width: "75%" }}
          aria-hidden
        />
      )}
      {bullets.length > 0 && (
        <div className="flex flex-col gap-[1px] mt-[1px]">
          {bullets.map((b) => (
            <div key={b.id} className="flex items-center gap-[3px]">
              <span
                aria-hidden
                className="w-[2px] h-[2px] rounded-full bg-gray-500"
              />
              <div
                aria-hidden
                className="h-[1px] bg-gray-300 rounded-full flex-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Skills section renders as one big run of small "pills" rather
 *  than item-style lines — matches the way the PDF preview renders
 *  skills as a comma-joined paragraph. */
function renderSkillsLine(count: number, width: number) {
  // Show at most 8 pill placeholders.
  const pills = Array.from({ length: Math.min(8, Math.max(count, 4)) });
  return (
    <div className="flex flex-wrap gap-[2px]">
      {pills.map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="h-[3px] rounded-sm bg-gray-300"
          style={{ width: Math.max(8, Math.round(width * 0.09 + ((i % 3) * 3))) }}
        />
      ))}
    </div>
  );
}
