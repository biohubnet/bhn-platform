import { algoliasearch } from "algoliasearch";

/** The three indices this app searches. Kept as separate indices (rather
 *  than one combined index with a type facet) so the multi-index search
 *  response lines up 1:1 with the admin search UI's three result groups. */
export const ALGOLIA_INDEX = {
  users: "bhn_users",
  courses: "bhn_courses",
  postings: "bhn_postings",
} as const;

let _client: ReturnType<typeof algoliasearch> | null = null;

/** Server-only client, authenticated with the Admin API key (write access).
 *  Never import this from client components — the admin key must never
 *  reach the browser. Used by the sync script and the search route. */
export function getAlgoliaClient() {
  if (_client) return _client;
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;
  if (!appId || !apiKey) {
    throw new Error(
      "ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY are not set. Add them to .env.local " +
        "(see .env.example) — get them from the Algolia dashboard's Overview page.",
    );
  }
  _client = algoliasearch(appId, apiKey);
  return _client;
}

let _insights: ReturnType<ReturnType<typeof algoliasearch>["initInsights"]> | null = null;

/** Server-only Insights client for click/conversion events (see
 *  /api/admin/search/click). Region is unconfirmed for this Algolia
 *  app — "us" is Algolia's common default; the only two valid values
 *  are "us" and "de", and using the "wrong" one still delivers events,
 *  it just affects which regional endpoint receives the write. */
export function getAlgoliaInsightsClient() {
  if (_insights) return _insights;
  _insights = getAlgoliaClient().initInsights({ region: "us" });
  return _insights;
}
