/**
 * Admin-only endpoint for setting the platform-wide active design
 * system.
 *
 *   GET   /api/admin/design-system   → current active id
 *   PATCH /api/admin/design-system   → set new active id
 *                                       body: { designSystem: "classic" | "cinematic" | ... }
 *
 * Auth: requireRole("admin"). Writes are upserts on the
 * PlatformSetting row keyed by `activeDesignSystem`. The next
 * request from any user reads the new value via the root layout —
 * no cache invalidation needed beyond a normal page reload.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getActiveDesignSystem, setActiveDesignSystem } from "@/lib/settings";
import { isValidDesignSystem } from "@/lib/design-system/registry";

export const runtime = "nodejs";

export async function GET() {
  await requireRole("admin");
  const active = await getActiveDesignSystem();
  return NextResponse.json({ designSystem: active });
}

export async function PATCH(req: Request) {
  await requireRole("admin");
  const body = await req.json().catch(() => ({} as { designSystem?: string }));
  const target = body.designSystem;
  if (typeof target !== "string" || !isValidDesignSystem(target)) {
    return NextResponse.json({ error: "Invalid design system id" }, { status: 400 });
  }
  const persisted = await setActiveDesignSystem(target);
  return NextResponse.json({ ok: true, designSystem: persisted });
}
