import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAlgoliaInsightsClient, ALGOLIA_INDEX } from "@/lib/algolia";

/**
 * Reports a single "clicked a search result" event to Algolia's Insights
 * API, keyed to the `queryID` the search route attached to each result
 * (see /api/admin/search). Fire-and-forget from the client — this never
 * blocks navigation to the clicked result.
 */
const VALID_INDEXES: string[] = Object.values(ALGOLIA_INDEX);

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "No user id on session" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { indexName, objectID, position, queryID } = body as {
    indexName?: string;
    objectID?: string;
    position?: number;
    queryID?: string;
  };
  if (
    typeof indexName !== "string" || !VALID_INDEXES.includes(indexName) ||
    typeof objectID !== "string" || !objectID ||
    typeof position !== "number" ||
    typeof queryID !== "string" || !queryID
  ) {
    return NextResponse.json({ error: "Missing or invalid indexName/objectID/position/queryID" }, { status: 400 });
  }

  const insights = getAlgoliaInsightsClient();
  await insights.pushEvents({
    events: [{
      eventName: "Admin search result clicked",
      eventType: "click",
      index: indexName,
      objectIDs: [objectID],
      positions: [position],
      queryID,
      userToken: userId,
    }],
  });

  return NextResponse.json({ ok: true });
}
