/**
 * /experience/facilities — Canadian biomanufacturing facilities map.
 *
 * Server-component page: queries the Facility table, hands the rows
 * + the rescan permissions flag to a client `FacilitiesMap` (which
 * lives behind a `dynamic({ ssr: false })` boundary because Leaflet
 * touches `window` on import).
 *
 * Auth: any signed-in user can VIEW the map. Only admin+ can trigger
 * the "Rescan facility" action.
 */
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { FacilitiesMap } from "@/components/facilities/FacilitiesMap";
import { FACILITY_SEED } from "@/lib/facilities/seed-data";

export const dynamic = "force-dynamic";

/** Select-set used by both the DB query and the in-memory fallback
 *  so the client surface gets the same shape either way. */
const FACILITY_FIELDS = {
  id: true, name: true, url: true, status: true,
  province: true, city: true, address: true,
  specialization: true, scale: true, notes: true,
  description: true, lat: true, lng: true,
  lastScannedAt: true, scanError: true,
} as const;

export default async function FacilitiesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const canRescan = checkIsStaff(role);

  // Try the DB first. Falls back gracefully if (a) the table
  // doesn't exist yet (migration hasn't run) or (b) the table is
  // empty (seed hasn't run). The auto-seed is best-effort — if
  // it errors (e.g. read-only replica, missing perms), we still
  // render the in-memory seed so the map is never blank.
  let facilities: Array<{
    id: string;
    name: string;
    url: string | null;
    status: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
    specialization: string | null;
    scale: string | null;
    notes: string | null;
    description: string | null;
    lat: number;
    lng: number;
    lastScannedAt: Date | null;
    scanError: string | null;
  }> = [];

  try {
    facilities = await prisma.facility.findMany({
      orderBy: [{ province: "asc" }, { city: "asc" }, { name: "asc" }],
      select: FACILITY_FIELDS,
    });
    // Auto-seed reconciliation — runs on every page load.
    //
    // Two kinds of work happen here:
    //   1. INSERT missing names (a fresh seed-data.ts entry was added
    //      since the last load — e.g. a web-scan pass for new sites).
    //   2. UPDATE structural fields (lat / lng / address / url /
    //      status / province / city) for existing rows when the seed
    //      value has drifted from what's in the DB.
    //
    // Structural vs narrative split — why update some fields but not
    // others?
    //   • STRUCTURAL fields (location, source URL, build status,
    //     province, city) are ground truth from the seed / research
    //     pass. If the seed gets a coordinate fix or an updated
    //     address, that should propagate to the deployed DB. There's
    //     no admin UI to edit these, so there's no admin work to
    //     overwrite.
    //   • NARRATIVE fields (specialization, scale, notes, description)
    //     ARE admin-editable: the `/api/admin/facilities/[id]/rescan`
    //     endpoint writes specialization + description, and admins
    //     would reasonably want to hand-correct the rest. We leave
    //     them alone after the initial create.
    //
    // Diff-then-upsert keeps the cost negligible on a steady-state
    // load: one SELECT, a tiny in-memory diff, then a write only
    // when something actually changed.
    const byName = new Map(facilities.map((f) => [f.name, f]));
    const seedsToWrite = FACILITY_SEED.filter((f) => {
      const existing = byName.get(f.name);
      if (!existing) return true; // INSERT
      // Compare structural fields. Any difference → UPDATE.
      return (
        Math.abs(existing.lat - f.lat) > 1e-4 ||
        Math.abs(existing.lng - f.lng) > 1e-4 ||
        existing.address !== f.address ||
        existing.url !== f.url ||
        existing.status !== f.status ||
        existing.province !== f.province ||
        existing.city !== f.city
      );
    });
    if (seedsToWrite.length > 0) {
      try {
        await Promise.all(
          seedsToWrite.map((f) =>
            prisma.facility.upsert({
              where: { name: f.name },
              create: { ...f },
              // Update only structural fields — admin-editable
              // narrative fields (specialization, scale, notes,
              // description) are preserved.
              update: {
                lat: f.lat,
                lng: f.lng,
                address: f.address,
                url: f.url,
                status: f.status,
                province: f.province,
                city: f.city,
              },
            }),
          ),
        );
        facilities = await prisma.facility.findMany({
          orderBy: [{ province: "asc" }, { city: "asc" }, { name: "asc" }],
          select: FACILITY_FIELDS,
        });
      } catch (seedErr) {
        // Auto-seed failed — log + fall through to the in-memory
        // seed below so the map still renders something useful.
        console.error("[facilities] auto-seed failed:", seedErr);
      }
    }
  } catch (queryErr) {
    // Table likely doesn't exist yet (migration pending). Render
    // the in-memory seed so the map isn't blank for the user.
    console.error("[facilities] DB query failed:", queryErr);
  }

  // Final fallback — if for any reason we still have no rows,
  // synthesise them from the in-memory seed. These get a synthetic
  // id (`seed-…`) so the client doesn't accidentally try to call
  // the rescan endpoint with a non-DB id.
  if (facilities.length === 0) {
    facilities = FACILITY_SEED.map((f, i) => ({
      id: `seed-${i}`,
      ...f,
      description: null,
      lastScannedAt: null,
      scanError: null,
    }));
  }

  // Serialise Date → ISO string for the client boundary.
  const serialised = facilities.map((f) => ({
    ...f,
    lastScannedAt: f.lastScannedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-5 pb-12">
      <PageHero
        eyebrow={<><MapPin size={11} /> Facilities map</>}
        title="Biomanufacturing in Canada — where it actually happens"
        description="Every Canadian biomanufacturing company, plant, and institute we know of, pinned to a city. Zoom in to disambiguate dots in the same metro, click any pin for the full record: status, address, specialisation, scale, notes. Staff can trigger a rescan to refresh a facility's record from its source URL."
      />
      <FacilitiesMap initialFacilities={serialised} canRescan={canRescan} />
    </div>
  );
}
