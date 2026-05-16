/**
 * CommitteeBadgeStrip — recognition chip(s) shown on the welcome
 * dashboard when the signed-in user holds one or more committee
 * memberships.
 *
 * Server component (it queries Prisma on render) — keep this on
 * the welcome path only. It auto-hides when the user is on no
 * committees, so unconditional mounts are safe.
 *
 * Shape: small horizontal strip of pill badges, each linking to
 * the first sidebar item registered for that committee. The
 * Equip Review chip pulls double duty as a shortcut to the
 * review queue.
 */
import Link from "next/link";
import { Award, ArrowRight, Rocket, Users, ClipboardList, Sparkles } from "lucide-react";
import { getCommitteeMetaForUser } from "@/lib/committees/membership";
import type { CommitteeSidebarItem } from "@/lib/committees/registry";

const ICONS: Record<CommitteeSidebarItem["icon"], React.ComponentType<{ size?: number; className?: string }>> = {
  Rocket,
  Users,
  Award,
  ClipboardList,
  Sparkles,
};

const TONE_CLS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100",
  violet:  "bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100",
  amber:   "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100",
  sky:     "bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100",
  rose:    "bg-rose-50 text-rose-800 ring-rose-200 hover:bg-rose-100",
};

interface Props {
  userId: string;
}

export async function CommitteeBadgeStrip({ userId }: Props) {
  if (!userId) return null;
  const committees = await getCommitteeMetaForUser(userId);
  if (committees.length === 0) return null;

  return (
    <section className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
        Committee role{committees.length > 1 ? "s" : ""}
      </span>
      {committees.map((c) => {
        const primaryLink = c.sidebarItems[0];
        const Icon = primaryLink ? ICONS[primaryLink.icon] ?? Award : Award;
        const toneCls = TONE_CLS[c.badgeTone] ?? TONE_CLS.violet;
        const inner = (
          <>
            <Icon size={12} />
            <span>{c.name}</span>
            {primaryLink && <ArrowRight size={11} className="opacity-60" />}
          </>
        );
        return primaryLink ? (
          <Link
            key={c.slug}
            href={primaryLink.href}
            className={
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ring-1 ring-inset transition-colors " +
              toneCls
            }
            title={c.description}
          >
            {inner}
          </Link>
        ) : (
          <span
            key={c.slug}
            className={
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ring-1 ring-inset " +
              toneCls
            }
            title={c.description}
          >
            {inner}
          </span>
        );
      })}
    </section>
  );
}
