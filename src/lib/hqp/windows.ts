/**
 * Server-side helpers for HQP application windows.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface WindowRow {
  id: string;
  year: number;
  title: string;
  description: string | null;
  opensAt: Date;
  closesAt: Date;
  status: string;
  createdAt: Date;
}

/** Currently-open window (or null when none). "Open" means
 *  status = "open" AND now is in [opensAt, closesAt]. */
export const currentOpenWindow = cache(async (): Promise<WindowRow | null> => {
  const now = new Date();
  const row = await prisma.hqpApplicationWindow.findFirst({
    where: {
      status: "open",
      opensAt: { lte: now },
      closesAt: { gte: now },
    },
    orderBy: { closesAt: "asc" },
  });
  return row ?? null;
});

/** All windows, newest first — for the admin list. */
export async function listWindows(): Promise<WindowRow[]> {
  return prisma.hqpApplicationWindow.findMany({
    orderBy: [{ year: "desc" }, { opensAt: "desc" }],
  });
}

export function isOpenForSubmissions(row: Pick<WindowRow, "status" | "opensAt" | "closesAt">, now: Date = new Date()): boolean {
  if (row.status !== "open") return false;
  return row.opensAt.getTime() <= now.getTime() && row.closesAt.getTime() >= now.getTime();
}
