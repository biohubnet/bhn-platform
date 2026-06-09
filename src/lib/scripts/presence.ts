/** Shared (client-safe) helpers for live script presence — no prisma. */

/** Distinct, legible highlight colours for live collaborators. */
export const PRESENCE_PALETTE = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

/** Stable colour for an editor key, so the same person keeps their colour. */
export function colorForKey(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PRESENCE_PALETTE[h % PRESENCE_PALETTE.length];
}

export interface PresencePeer {
  editorKey: string;
  name: string;
  color: string;
  activeSid: string | null;
  recentSids: string[];
}
