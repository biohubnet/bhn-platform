import { Inngest } from "inngest";

/** Inngest orchestrator client — durable steps, retries, concurrency caps,
 *  scheduling, and cancellation for the autonomous agents. */
export const inngest = new Inngest({ id: "bhn-training-platform" });
