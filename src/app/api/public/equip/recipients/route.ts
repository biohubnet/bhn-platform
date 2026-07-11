/**
 * PUBLIC EQUIP recipients feed — no login required.
 *
 * The BioHubNet website (biohubnet.ca, built with ChatGPT Codex) fetches this to
 * render a stylized "who we funded" list. Data is the curated recipient roster
 * (src/lib/equip/recipients.ts) reduced to the SIMPLIFIED public subset —
 * company + recipient + institution + track, and (VentureLift only) a project
 * name. LinkedIn / status / posts-and-recognition history stay admin-only and
 * are NOT exposed here.
 *
 * CORS is open (`*`) because this is public, non-credentialed read data; Codex
 * may fetch it server-side (no CORS needed) or client-side (CORS needed).
 *
 * Contract (keep stable — the external page depends on it):
 *   GET → 200 {
 *     updated: "YYYY-MM-DD",
 *     recipients: [ { company, recipient, institution,
 *                     track: "VC" | "VL" | "Both", project? } ]
 *   }
 */
import { NextResponse } from "next/server";
import { EQUIP_UPDATED, toPublicRecipients } from "@/lib/equip/recipients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function GET() {
  return NextResponse.json(
    { updated: EQUIP_UPDATED, recipients: toPublicRecipients() },
    {
      headers: {
        ...CORS,
        // CDN-cache for an hour; the data only changes on redeploy anyway.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
