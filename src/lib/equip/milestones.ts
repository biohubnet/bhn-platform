/**
 * Milestone helpers for funded Equip applications.
 *
 * When an application transitions to "funded", we template a small
 * set of check-ins (different shape for VentureConnect vs
 * VentureLift) so the funded applicant has a clear, scheduled set
 * of moments where reviewers will look at progress.
 *
 * The applicant updates each milestone's status + note in the
 * tracker UI; the admin can also bump status / leave notes from
 * the review detail. Storage is the EquipApplication.milestones
 * JSON column so we don't pay per-row overhead for what's a small
 * list (typically 3-5 entries per application).
 */
import { randomBytes } from "crypto";
import type { EquipMilestone, EquipStream } from "./types";

/** Generate the default milestone set when an application is
 *  approved → funded. Offsets are days from the funded date. */
export function templateMilestones(stream: EquipStream, fundedOn: Date = new Date()): EquipMilestone[] {
  const baseTime = fundedOn.getTime();
  const offsetISO = (days: number) =>
    new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();

  if (stream === "venture_connect") {
    return [
      {
        id: randomBytes(8).toString("hex"),
        title: "Event registration confirmed",
        dueOn: offsetISO(7),
        status: "pending",
        updatedAt: fundedOn.toISOString(),
      },
      {
        id: randomBytes(8).toString("hex"),
        title: "Travel + lodging booked",
        dueOn: offsetISO(21),
        status: "pending",
        updatedAt: fundedOn.toISOString(),
      },
      {
        id: randomBytes(8).toString("hex"),
        title: "Post-event report",
        dueOn: offsetISO(60),
        status: "pending",
        updatedAt: fundedOn.toISOString(),
      },
    ];
  }

  // VentureLift — longer arc, 4 check-ins over ~6 months.
  return [
    {
      id: randomBytes(8).toString("hex"),
      title: "Project kick-off — 30-day plan locked",
      dueOn: offsetISO(14),
      status: "pending",
      updatedAt: fundedOn.toISOString(),
    },
    {
      id: randomBytes(8).toString("hex"),
      title: "Mid-project check-in — prototype / IP progress",
      dueOn: offsetISO(75),
      status: "pending",
      updatedAt: fundedOn.toISOString(),
    },
    {
      id: randomBytes(8).toString("hex"),
      title: "Milestone validation — pilot or proof point",
      dueOn: offsetISO(135),
      status: "pending",
      updatedAt: fundedOn.toISOString(),
    },
    {
      id: randomBytes(8).toString("hex"),
      title: "Final report + lessons learned",
      dueOn: offsetISO(180),
      status: "pending",
      updatedAt: fundedOn.toISOString(),
    },
  ];
}

/** Patch a single milestone in the list. Returns the new array or
 *  the original if the id isn't found. */
export function patchMilestone(
  list: EquipMilestone[],
  id: string,
  patch: Partial<Pick<EquipMilestone, "status" | "note">>,
): EquipMilestone[] {
  return list.map((m) =>
    m.id === id
      ? { ...m, ...patch, updatedAt: new Date().toISOString() }
      : m,
  );
}

/** What fraction of milestones are complete? Used for the
 *  progress bar in the tracker UI. */
export function progress(list: EquipMilestone[]): { done: number; total: number; fraction: number } {
  const total = list.length;
  if (total === 0) return { done: 0, total: 0, fraction: 0 };
  const done = list.filter((m) => m.status === "complete").length;
  return { done, total, fraction: done / total };
}
