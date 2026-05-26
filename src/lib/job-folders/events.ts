/**
 * Auto-logger for JobFolderEvent. Centralised so every place in the
 * codebase that mutates a folder can call one function and the
 * Timeline tab stays accurate.
 *
 * Fire-and-forget — wraps the insert in try/catch so a logging
 * failure never breaks the underlying mutation.
 */
import { prisma } from "@/lib/prisma";

export type JobFolderEventKind =
  | "created"
  | "status_changed"
  | "applied"
  | "sim_requested"
  | "sim_ready"
  | "sim_rejected"
  | "sim_failed"
  | "duplicated"
  | "interview_scheduled"
  | "deadline_set"
  | "deadline_cleared"
  | "manual";

export async function logFolderEvent(args: {
  folderId: string;
  kind: JobFolderEventKind;
  body: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.jobFolderEvent.create({
      data: {
        folderId: args.folderId,
        kind: args.kind,
        body: args.body,
        payload: args.payload as object | undefined,
      },
    });
  } catch (err) {
    console.error("[jobFolder/events] log failed:", err);
  }
}
