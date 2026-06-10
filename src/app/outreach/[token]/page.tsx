/**
 * /outreach/[token] — PUBLIC collaborative view of one shared outreach list.
 * Outside the (dashboard) route group, so no login: the token is the access
 * credential. First visit asks for a name (OutreachCollaborator + httpOnly
 * cookie); after that the visitor can add contacts and edit cells, with all
 * additions attributed to their name.
 */
import { BookUser } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveOutreachToken, getOutreachCollaborator } from "@/lib/outreach/share";
import { getPersonColumns } from "@/lib/outreach/directory";
import { OutreachJoinForm } from "@/components/workspace/OutreachJoinForm";
import { SharedOutreachList, type SharedRow } from "@/components/workspace/SharedOutreachList";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ token: string }> }

const asValues = (v: unknown): Record<string, string> =>
  typeof v === "object" && v !== null ? (v as Record<string, string>) : {};

export default async function SharedOutreachPage({ params }: Props) {
  const { token } = await params;
  const res = await resolveOutreachToken(token);

  if (!res.ok) {
    return (
      <Shell>
        <Notice
          title={res.reason === "expired" ? "This link has expired" : "This link isn't valid"}
          body="Ask the person who shared the list with you for a fresh link."
        />
      </Shell>
    );
  }

  const collab = await getOutreachCollaborator(res.list.id);

  let rows: SharedRow[] = [];
  let personColumns: { key: string; label: string }[] = [];
  if (collab) {
    const [cols, memberships] = await Promise.all([
      getPersonColumns(),
      prisma.outreachMembership.findMany({
        where: { listId: res.list.id },
        orderBy: { order: "asc" },
        include: { person: true },
      }),
    ]);
    personColumns = cols;
    rows = memberships.map((m) => ({
      membershipId: m.id,
      personId: m.personId,
      personValues: asValues(m.person.values),
      values: asValues(m.values),
      addedByName: m.addedByName,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  return (
    <Shell>
      <header className="mx-auto mb-4 flex w-full max-w-6xl items-center gap-3 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <BookUser size={15} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-fg">{res.list.name}</h1>
          <p className="text-[11px] text-muted">
            BHN outreach list
            {collab ? <> · contributing as <span className="font-semibold text-fg">{collab.name}</span></> : null}
          </p>
        </div>
      </header>

      {collab ? (
        <div className="mx-auto w-full max-w-6xl">
          <SharedOutreachList
            token={token}
            personColumns={personColumns}
            columns={res.list.columns}
            rows={rows}
            canEdit={res.token.canEdit}
          />
        </div>
      ) : (
        <OutreachJoinForm token={token} listName={res.list.name} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main data-theme="light" className="min-h-screen bg-elevated/40 px-4 py-6 text-fg sm:px-6">
      {children}
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto mt-20 w-full max-w-md rounded-2xl border border-line bg-card-solid p-6 text-center shadow-elevated">
      <h1 className="text-lg font-bold text-fg">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
