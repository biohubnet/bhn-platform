/**
 * Lazy, idempotent seed for the BHN Promo Video Project. Run from the Video
 * Production page so the project is "already created" on first visit — no
 * manual seed step. The Molly script is stored as the original guide's HTML +
 * CSS (format "html") so it keeps its original styling.
 */
import { prisma } from "@/lib/prisma";
import { MOLLY_HTML, MOLLY_CSS } from "./molly-html";

const PROJECT_TITLE = "BHN Promo Video Project";
const SCRIPT_TITLE = "Molly Interview Conversation Guide";

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
    select: { id: true },
  });
  if (existing) return;

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
