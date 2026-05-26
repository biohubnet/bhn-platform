/**
 * /profile/job-folders/[id]/print — print-optimised view.
 *
 * Renders the folder's cover letter + resume in a single column,
 * stripped of platform chrome, with @media print rules that hide
 * navigation and keep generous margins. Ctrl-P → PDF in any browser.
 *
 * The Role-play sim and lifecycle events are NOT included — this
 * surface is "what you'd attach to an application," not an archive.
 * The JD and interview prep are also excluded since neither belongs
 * in a submitted package.
 */
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ResumeContent, ResumeSection, ResumeItem } from "@/lib/resume/types";

export const dynamic = "force-dynamic";

const SECTION_KIND_HEADINGS: Record<string, string> = {
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  publications: "Publications",
  awards: "Awards",
  volunteering: "Volunteering",
  summary: "Summary",
  other: "Other",
};

export default async function FolderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const { id } = await params;
  const folder = await prisma.jobFolder.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      title: true,
      coverLetter: true,
      recruiterName: true,
      referredBy: true,
      resume: {
        select: {
          id: true,
          name: true,
          content: true,
        },
      },
    },
  });
  if (!folder || folder.userId !== userId) notFound();

  const resumeContent = folder.resume?.content as ResumeContent | undefined;

  return (
    <div className="print-root">
      {/* Inline print styles — applied to the whole document, not
          scoped, so the dashboard chrome around <main> also hides
          when the user prints. */}
      <style>{`
        @media print {
          .dashboard-layout > *:not(main) { display: none !important; }
          .dashboard-layout main { padding: 0 !important; overflow: visible !important; }
          .max-w-screen-2xl { max-width: none !important; padding: 0 !important; }
          .print-root { background: white !important; color: black !important; }
          .print-noprint { display: none !important; }
          @page { margin: 16mm; }
        }
        .print-root { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.55; max-width: 760px; margin: 0 auto; padding: 32px 24px; color: #111; background: white; }
        .print-root h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        .print-root h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
        .print-root h3 { font-size: 14px; font-weight: 700; margin: 14px 0 2px; }
        .print-root p { margin: 0 0 10px; }
        .print-root ul { margin: 4px 0 10px 20px; padding: 0; }
        .print-root li { margin-bottom: 4px; }
        .print-meta { color: #555; font-size: 12.5px; margin-bottom: 18px; }
        .print-btn { display: inline-block; background: #6366f1; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; }
        .print-actions { margin-bottom: 24px; }
      `}</style>

      <div className="print-actions print-noprint">
        <button onClick={() => undefined} className="print-btn" id="print-btn">
          Print / save as PDF
        </button>
        <span style={{ marginLeft: 12, fontSize: 12, color: "#666" }}>
          Cover letter + resume only — JD, prep, and role-play sim aren&apos;t
          included in the printable bundle.
        </span>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.getElementById('print-btn').addEventListener('click',function(){window.print();});",
          }}
        />
      </div>

      <h1>{folder.title}</h1>
      <p className="print-meta">
        {folder.recruiterName && <>Attn: {folder.recruiterName}</>}
        {folder.recruiterName && folder.referredBy && <> · </>}
        {folder.referredBy && <>Referred by {folder.referredBy}</>}
      </p>

      <h2>Cover letter</h2>
      {folder.coverLetter.trim() ? (
        renderMarkdownLikeBlock(folder.coverLetter)
      ) : (
        <p style={{ fontStyle: "italic", color: "#888" }}>
          (No cover letter drafted yet.)
        </p>
      )}

      <h2>Resume</h2>
      {!folder.resume ? (
        <p style={{ fontStyle: "italic", color: "#888" }}>
          (No resume linked to this folder.)
        </p>
      ) : !resumeContent ? (
        <p style={{ fontStyle: "italic", color: "#888" }}>
          (Resume content not parsed yet.)
        </p>
      ) : (
        <ResumeBlock content={resumeContent} />
      )}
    </div>
  );
}

/** Renders the cover letter's markdown approximately — paragraphs
 *  by blank-line splits, no styling beyond <p>. Robust enough for the
 *  letters this surface handles; we don't need a full Markdown parser
 *  for a print page. */
function renderMarkdownLikeBlock(md: string) {
  const paragraphs = md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((p, i) => (
    <p key={i} style={{ whiteSpace: "pre-wrap" }}>
      {p}
    </p>
  ));
}

function ResumeBlock({ content }: { content: ResumeContent }) {
  const header = content.header as Record<string, unknown> | undefined;
  const headerLine = header
    ? [
        header.name && String(header.name),
        header.email && String(header.email),
        header.phone && String(header.phone),
        header.location && String(header.location),
      ].filter(Boolean).join(" · ")
    : "";
  const sections = [...(content.sections ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  return (
    <>
      {headerLine && (
        <p className="print-meta" style={{ marginBottom: 16 }}>
          {headerLine}
        </p>
      )}
      {sections.map((section) => (
        <ResumeSectionView key={section.id} section={section} />
      ))}
    </>
  );
}

function ResumeSectionView({ section }: { section: ResumeSection }) {
  const heading =
    (section.title && section.title.trim()) ||
    SECTION_KIND_HEADINGS[section.kind] ||
    "Section";
  const items = [...(section.items ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  if (items.length === 0) return null;
  return (
    <section>
      <h2 style={{ marginTop: 22, fontSize: 13, borderBottom: "1px solid #aaa" }}>
        {heading}
      </h2>
      {items.map((item) => (
        <ResumeItemView key={item.id} item={item} />
      ))}
    </section>
  );
}

function ResumeItemView({ item }: { item: ResumeItem }) {
  const titleLine = [item.title, item.subtitle].filter(Boolean).join(" — ");
  const dateLine = (() => {
    if (item.dateRange) return item.dateRange;
    const start = item.startDate ?? "";
    const end = item.current ? "Present" : (item.endDate ?? "");
    return start || end ? `${start} – ${end}` : "";
  })();
  const meta = [dateLine, item.metric, item.url].filter(Boolean).join("  ·  ");
  const bullets = [...(item.bullets ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );

  return (
    <div style={{ marginBottom: 14 }}>
      {titleLine && <h3>{titleLine}</h3>}
      {meta && (
        <p style={{ fontSize: 12, color: "#555", margin: "0 0 4px" }}>{meta}</p>
      )}
      {item.description && <p>{item.description}</p>}
      {bullets.length > 0 && (
        <ul>
          {bullets.map((b) => (
            <li key={b.id}>{b.body}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
