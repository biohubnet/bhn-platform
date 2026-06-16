/**
 * Inngest functions for the autonomous triage agent. This is the orchestration
 * layer (durable execution, retries, concurrency 1, scheduling) — NOT a Vercel
 * cron handler. The scheduled function fires on Inngest's cron; the event
 * function lets the admin "run now" via an Inngest event.
 */
import { inngest } from "./client";
import { runTriageAgent } from "@/lib/agent/runTriage";

/** Scheduled every 6 hours, orchestrated by Inngest. concurrency:1 + retries. */
export const triageScheduled = inngest.createFunction(
  { id: "ai-triage-agent", concurrency: 1, retries: 2, triggers: [{ cron: "0 */6 * * *" }] },
  async ({ step }) => step.run("run-triage", () => runTriageAgent("schedule")),
);

/** Event-triggered run (the admin dashboard can emit `agent/triage.run`). */
export const triageManual = inngest.createFunction(
  { id: "ai-triage-agent-manual", concurrency: 1, triggers: [{ event: "agent/triage.run" }] },
  async ({ step }) => step.run("run-triage", () => runTriageAgent("manual")),
);

export const functions = [triageScheduled, triageManual];
