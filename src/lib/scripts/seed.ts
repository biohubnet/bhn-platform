/**
 * Lazy, idempotent seed for the BHN Promo Video Project. Run from the Video
 * Production page so the project is "already created" on first visit — no
 * manual seed step. The Molly script is stored as the original guide's HTML +
 * CSS (format "html") so it keeps its original styling.
 */
import { prisma } from "@/lib/prisma";
import { MOLLY_HTML, MOLLY_CSS } from "./molly-html";
import { SYMPOSIUM_HTML, SYMPOSIUM_CSS } from "./symposium-comms-html";

const PROJECT_TITLE = "BHN Promo Video Project";
const SCRIPT_TITLE = "Molly Interview Conversation Guide";

const SYMPOSIUM_PROJECT_TITLE = "2026 Annual Symposium & Training Week";
const SYMPOSIUM_SCRIPT_TITLE = "2026 Symposium — Communications Plan";

export async function ensureBhnPromoProject(createdById: string | null): Promise<void> {
  let project = await prisma.videoProject.findFirst({
    where: { title: PROJECT_TITLE },
    select: { id: true },
  });
  if (!project) {
    project = await prisma.videoProject.create({
      data: {
        title: PROJECT_TITLE,
        summary: "Promo / introductory video for BHN's target audiences.",
        category: "marketing",
        createdById,
      },
      select: { id: true },
    });
  }

  const existing = await prisma.script.findFirst({
    where: { projectId: project.id, title: SCRIPT_TITLE },
    select: { id: true, format: true },
  });
  if (existing) {
    // Upgrade an earlier sections-format seed to the original-styled HTML so
    // the script keeps the guide's exact look (one-time — leaves html as-is).
    if (existing.format !== "html") {
      await prisma.script.update({
        where: { id: existing.id },
        data: { format: "html", richContent: { kind: "html", html: MOLLY_HTML, css: MOLLY_CSS } },
      });
      await prisma.scriptSection.deleteMany({ where: { scriptId: existing.id } });
    }
    return;
  }

  await prisma.script.create({
    data: {
      projectId: project.id,
      title: SCRIPT_TITLE,
      format: "html",
      richContent: { kind: "html", html: MOLLY_HTML, css: MOLLY_CSS },
      createdById,
    },
  });
}

/**
 * Lazy, idempotent seed for the 2026 Annual Symposium & Training Week
 * communications plan. Same shape as the Molly guide: a marketing project
 * holding one "html"-format script so it renders in the HtmlScriptEditor
 * (editable Gantt + full plan, shareable, version history). Never
 * overwrites an existing plan — once created, the team owns the content.
 */
export async function ensureSymposiumCommsProject(createdById: string | null): Promise<void> {
  let project = await prisma.videoProject.findFirst({
    where: { title: SYMPOSIUM_PROJECT_TITLE },
    select: { id: true },
  });
  if (!project) {
    project = await prisma.videoProject.create({
      data: {
        title: SYMPOSIUM_PROJECT_TITLE,
        summary:
          "Communications & marketing plan for the 2026 Annual Symposium and Training Week — Gantt timeline, pre/during/post promotion, sponsorship, and task breakdown.",
        category: "marketing",
        createdById,
      },
      select: { id: true },
    });
  }

  const existing = await prisma.script.findFirst({
    where: { projectId: project.id, title: SYMPOSIUM_SCRIPT_TITLE },
    select: { id: true },
  });
  if (existing) return;

  await prisma.script.create({
    data: {
      projectId: project.id,
      title: SYMPOSIUM_SCRIPT_TITLE,
      format: "html",
      richContent: { kind: "html", html: SYMPOSIUM_HTML, css: SYMPOSIUM_CSS },
      createdById,
    },
  });
}
