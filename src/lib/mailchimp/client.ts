/**
 * Mailchimp Marketing API client — thin, fetch-based, no SDK.
 *
 * Why hand-rolled
 *   We use ~3 endpoints (upsert member, get member, update tags). The
 *   official @mailchimp/mailchimp_marketing SDK pulls in axios + jq-
 *   style typings + a build-time codegen that we don't need. A 100-
 *   line fetch wrapper is auditable and edge-runtime-portable.
 *
 * Auth + region
 *   Mailchimp's API key always ends in -<dc>, e.g. "abc123-us10". The
 *   dc ("data center") prefix is the subdomain on the API host. We
 *   accept either an explicit MAILCHIMP_SERVER_PREFIX or derive it
 *   from the key.
 *
 * Status semantics
 *   "pending"      — Mailchimp emails the DOI confirmation; status
 *                    flips to "subscribed" only after the link click.
 *   "subscribed"   — single-opt-in; the user is on the list now.
 *   "unsubscribed" — we PATCH a member here when an admin removes
 *                    them from /admin/newsletter on the BHN side.
 *
 * We always use "pending" on signup. Hard-coded on the consumer side
 * (api/auth/register) — this module just exposes the primitive.
 *
 * Idempotent upsert
 *   Mailchimp identifies a member by md5(email.toLowerCase()) — the
 *   "subscriber hash". PUT /lists/{id}/members/{hash} either creates
 *   or updates, which lets register-API retries be safe.
 *
 * Error handling
 *   Any non-2xx returns a Result with `ok: false` and the parsed
 *   Mailchimp error body. We NEVER throw — register-API is the
 *   primary caller and we don't want a Mailchimp outage to fail
 *   account creation.
 */
import { createHash } from "node:crypto";

/** Public Result type — callers branch on `ok`. Never throws. */
export type MailchimpResult =
  | {
      ok: true;
      memberId: string;
      status: "pending" | "subscribed" | "unsubscribed" | "cleaned" | "transactional" | "archived";
    }
  | {
      ok: false;
      /** "config" — env vars missing. "api" — Mailchimp returned non-2xx.
       *  "network" — fetch failed entirely. "disabled" — feature gate off. */
      kind: "config" | "api" | "network" | "disabled";
      status?: number;
      message: string;
    };

interface SubscribeInput {
  email: string;
  /** Pre-fills FNAME on the Mailchimp member. Optional. */
  firstName?: string | null;
  /** Pre-fills LNAME (we don't currently send this but the contract
   *  allows it for future use). */
  lastName?: string | null;
  /** Tags to attach for segmentation. e.g. ["bhn-signup", "trainee"]. */
  tags?: string[];
  /** IPv4/IPv6 of the user at signup time. Mailchimp stores it on
   *  the member record and presents it as part of CASL/GDPR audit. */
  ipSignup?: string | null;
  /** ISO 8601 string. Falls back to "now" if omitted. */
  timestampSignup?: string | null;
  /** "pending" for double-opt-in (default), "subscribed" for single. */
  status?: "pending" | "subscribed";
  /** Merge-field overrides — Mailchimp's catch-all for custom fields. */
  mergeFields?: Record<string, string>;
}

/** True iff the env is configured enough to make an API call. */
export function mailchimpEnabled(): boolean {
  return !!(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID);
}

/** md5 of lowercased email — Mailchimp's subscriber hash. */
export function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

/** Derive "us10" / "eu1" / etc. from the API key suffix, or use the
 *  explicit env override. Returns null if neither is available. */
function serverPrefix(): string | null {
  const explicit = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
  if (explicit) return explicit;
  const key = process.env.MAILCHIMP_API_KEY?.trim();
  if (!key) return null;
  const dash = key.lastIndexOf("-");
  if (dash < 0 || dash === key.length - 1) return null;
  return key.slice(dash + 1);
}

/** Build the base URL for a given list endpoint. Returns null when the
 *  env is incomplete — caller should short-circuit with a "config"
 *  Result. */
function listUrl(path: string): string | null {
  const prefix = serverPrefix();
  const listId = process.env.MAILCHIMP_LIST_ID?.trim();
  if (!prefix || !listId) return null;
  return `https://${prefix}.api.mailchimp.com/3.0/lists/${listId}${path}`;
}

function authHeader(): string {
  // Mailchimp ignores the username; "anystring:apikey" is the
  // convention shown in their docs.
  const key = process.env.MAILCHIMP_API_KEY ?? "";
  return `Basic ${Buffer.from(`anystring:${key}`).toString("base64")}`;
}

/**
 * Upsert a member in "pending" status (DOI) by default. Idempotent:
 * a second call with the same email + status is a no-op on Mailchimp
 * side.
 *
 * Returns a typed Result. NEVER throws — the register API treats
 * failure as best-effort and continues account creation.
 */
export async function subscribeMember(input: SubscribeInput): Promise<MailchimpResult> {
  if (!mailchimpEnabled()) {
    return { ok: false, kind: "disabled", message: "Mailchimp env not configured." };
  }
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, kind: "config", message: "Invalid email." };
  }

  const hash = subscriberHash(email);
  const url = listUrl(`/members/${hash}`);
  if (!url) {
    return { ok: false, kind: "config", message: "Mailchimp list / server prefix missing." };
  }

  const mergeFields: Record<string, string> = { ...(input.mergeFields ?? {}) };
  if (input.firstName) mergeFields.FNAME = input.firstName;
  if (input.lastName) mergeFields.LNAME = input.lastName;

  // status_if_new sets the DOI status on first upsert; on subsequent
  // PUTs we don't want to override an already-confirmed subscriber
  // back to "pending", so omit `status` and rely on status_if_new.
  const body: Record<string, unknown> = {
    email_address: email,
    status_if_new: input.status ?? "pending",
    merge_fields: mergeFields,
    timestamp_signup: input.timestampSignup ?? new Date().toISOString(),
  };
  if (input.ipSignup) body.ip_signup = input.ipSignup;
  if (input.tags?.length) {
    // PUT /members supports `tags: string[]` at upsert time.
    body.tags = input.tags;
  }

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // Mailchimp can be slow under load; bound the wait so register-
      // API never hangs longer than 10s on the third-party call.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const errorBody = (await res.json().catch(() => ({}))) as { detail?: string; title?: string };
      return {
        ok: false,
        kind: "api",
        status: res.status,
        message: errorBody.detail ?? errorBody.title ?? `Mailchimp ${res.status}`,
      };
    }
    const payload = (await res.json()) as { id: string; status: string };
    return {
      ok: true,
      memberId: payload.id,
      status: payload.status as MailchimpResult extends { ok: true } ? MailchimpResult["status"] : never,
    };
  } catch (err) {
    return {
      ok: false,
      kind: "network",
      message: err instanceof Error ? err.message : "Mailchimp network error",
    };
  }
}

/**
 * Mark an existing member as "unsubscribed" — used when an admin
 * removes someone from the list on the BHN side. Idempotent.
 */
export async function unsubscribeMember(email: string): Promise<MailchimpResult> {
  if (!mailchimpEnabled()) {
    return { ok: false, kind: "disabled", message: "Mailchimp env not configured." };
  }
  const hash = subscriberHash(email);
  const url = listUrl(`/members/${hash}`);
  if (!url) {
    return { ok: false, kind: "config", message: "Mailchimp list / server prefix missing." };
  }
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "unsubscribed" }),
      signal: AbortSignal.timeout(10_000),
    });
    // 404 = member never existed on the Mailchimp side. Treat as
    // success — the desired end state (not subscribed) is reached.
    if (res.status === 404) {
      return { ok: true, memberId: hash, status: "unsubscribed" };
    }
    if (!res.ok) {
      const errorBody = (await res.json().catch(() => ({}))) as { detail?: string; title?: string };
      return {
        ok: false,
        kind: "api",
        status: res.status,
        message: errorBody.detail ?? errorBody.title ?? `Mailchimp ${res.status}`,
      };
    }
    const payload = (await res.json()) as { id: string; status: string };
    return { ok: true, memberId: payload.id, status: payload.status as "unsubscribed" };
  } catch (err) {
    return {
      ok: false,
      kind: "network",
      message: err instanceof Error ? err.message : "Mailchimp network error",
    };
  }
}
