/**
 * Server-side getters for editable copy strings.
 *
 * Two access patterns:
 *   • `getCopy(key, fallback)` — single string. One indexed lookup;
 *     fine for pages with 1-2 editable strings.
 *   • `getCopyMap(keys[])` — bulk fetch. Use when a page renders many
 *     strings (the /admin/copy index, or a future homepage with
 *     several editable hero blocks).
 *
 * Both fall back to the passed default when no row exists in
 * EditableCopy. This is what makes the system safe to roll out
 * incrementally: ship `<EditableText>` calls with code defaults,
 * land the migration, admins start editing — no broken render in
 * between.
 */
import { prisma } from "@/lib/prisma";

export async function getCopy(key: string, fallback: string): Promise<string> {
  const row = await prisma.editableCopy
    .findUnique({ where: { key }, select: { value: true } })
    .catch(() => null);
  return row?.value ?? fallback;
}

export async function getCopyMap(keys: string[]): Promise<Record<string, string | null>> {
  if (keys.length === 0) return {};
  const rows = await prisma.editableCopy
    .findMany({ where: { key: { in: keys } }, select: { key: true, value: true } })
    .catch(() => [] as Array<{ key: string; value: string }>);
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = null;
  for (const r of rows) out[r.key] = r.value;
  return out;
}
