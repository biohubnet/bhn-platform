import { prisma } from "./prisma";
import { headers } from "next/headers";

/** Crude device classification from the user-agent string. */
export function deviceClass(ua: string | null | undefined): string {
  if (!ua) return "unknown";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

interface ServerEventInput {
  userId?: string | null;
  role?: string | null;
  name: string;
  path?: string | null;
  props?: Record<string, unknown> | null;
}

/**
 * Server-side fire-and-forget tracker. Failures never throw — analytics
 * must never break a user-facing flow.
 */
export async function trackServer(input: ServerEventInput) {
  try {
    const h = await headers();
    const ua = h.get("user-agent");
    const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
    await prisma.event.create({
      data: {
        userId: input.userId ?? null,
        role: input.role ?? null,
        name: input.name,
        path: input.path ?? null,
        props: (input.props ?? undefined) as object | undefined,
        device: deviceClass(ua),
        ip,
        userAgent: ua,
      },
    });
  } catch (e) {
    console.error("trackServer failed:", (e as Error).message);
  }
}
