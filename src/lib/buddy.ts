import { prisma } from "./prisma";

/** Returns the buddy pair if the user is one of its members, else null. */
export async function getMyBuddyPair(pairId: string, userId: string) {
  const pair = await prisma.buddyPair.findUnique({
    where: { id: pairId },
    include: {
      initiator: { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
      partner:   { select: { id: true, name: true, email: true, jobTitle: true, organization: true } },
    },
  });
  if (!pair) return null;
  if (pair.initiatorId !== userId && pair.partnerId !== userId) return null;
  return pair;
}

/** Resolve "the other side" of a buddy pair from the perspective of `userId`. */
export function otherUser(pair: { initiatorId: string; partnerId: string; initiator: unknown; partner: unknown }, userId: string) {
  return pair.initiatorId === userId ? pair.partner : pair.initiator;
}
