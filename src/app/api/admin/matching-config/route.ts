/**
 * Admin: get + save the matching-engine config.
 *
 *   GET  /api/admin/matching-config     → current config + defaults
 *   POST /api/admin/matching-config     → save new config (audited)
 *   POST /api/admin/matching-config?test=1
 *     body: { config, userId, postingId }
 *     → score the pair using the supplied (ephemeral) config so the
 *       admin can preview impact before saving.
 *
 * All three handlers are gated to admin/superadmin via requireRole.
 */
import { NextRequest, NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";
import { requireRole, getSession } from "@/lib/auth";
import {
  type MatchingConfig,
  DEFAULT_MATCHING_CONFIG,
  getMatchingConfig,
  saveMatchingConfig,
} from "@/lib/matching/config";
import { scoreFitForTrainee } from "@/lib/matching/fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;
  const current = await getMatchingConfig();
  return NextResponse.json({
    current,
    defaults: DEFAULT_MATCHING_CONFIG,
  });
}

export async function POST(req: NextRequest) {
  const session = await guardRole("admin");
  if (session instanceof NextResponse) return session;
  const url = new URL(req.url);
  const test = url.searchParams.get("test") === "1";
  const body = (await req.json().catch(() => ({}))) as {
    config?: Partial<MatchingConfig>;
    userId?: string;
    postingId?: string;
  };

  if (test) {
    // ── Ephemeral-score test path ───────────────────────────────
    // Run the scorer with the supplied config but DO NOT persist.
    // Used by the live-preview panel on /admin/matching-config.
    if (!body.userId || !body.postingId) {
      return NextResponse.json(
        { error: "userId and postingId are required for ?test=1." },
        { status: 400 },
      );
    }
    const ephemeral = mergeForTest(body.config);
    const fit = await scoreFitForTrainee(body.userId, body.postingId, ephemeral);
    return NextResponse.json({ ok: true, fit, config: ephemeral });
  }

  // ── Save path ─────────────────────────────────────────────────
  const actorId = (session.user as { id?: string }).id;
  if (!actorId) {
    return NextResponse.json({ error: "Session missing user id." }, { status: 400 });
  }
  const saved = await saveMatchingConfig(body.config ?? {}, actorId);
  return NextResponse.json({ ok: true, saved });
}

/** Apply defaults inline for the test path. saveMatchingConfig already
 *  clamps + range-checks on the persisted path; the test path skips
 *  the DB but should still produce a fully-formed config. */
function mergeForTest(input: Partial<MatchingConfig> | undefined): MatchingConfig {
  const d = DEFAULT_MATCHING_CONFIG;
  if (!input) return d;
  return {
    weights: {
      direct:   input.weights?.direct   ?? d.weights.direct,
      semantic: input.weights?.semantic ?? d.weights.semantic,
      pathway:  input.weights?.pathway  ?? d.weights.pathway,
    },
    bands: {
      high:   input.bands?.high   ?? d.bands.high,
      medium: input.bands?.medium ?? d.bands.medium,
    },
    thresholds: {
      profileCompleteness:                input.thresholds?.profileCompleteness                ?? d.thresholds.profileCompleteness,
      semanticBridgeMin:                  input.thresholds?.semanticBridgeMin                  ?? d.thresholds.semanticBridgeMin,
      pathwayAlignMin:                    input.thresholds?.pathwayAlignMin                    ?? d.thresholds.pathwayAlignMin,
      perPathwayBoost:                    input.thresholds?.perPathwayBoost                    ?? d.thresholds.perPathwayBoost,
      requiredSkillBonus:                 input.thresholds?.requiredSkillBonus                 ?? d.thresholds.requiredSkillBonus,
      minPostingSkillsForFullConfidence:  input.thresholds?.minPostingSkillsForFullConfidence  ?? d.thresholds.minPostingSkillsForFullConfidence,
    },
  };
}

// Suppress unused-getSession lint when audit logging isn't doing
// anything special (saveMatchingConfig handles audit internally).
void getSession;
