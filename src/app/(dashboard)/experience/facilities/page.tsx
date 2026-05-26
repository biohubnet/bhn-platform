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

export const dynamic = "force-dynamic";

export default async function FacilitiesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const canRescan = checkIsStaff(role);

  const facilities = await prisma.facility.findMany({
    orderBy: [{ province: "asc" }, { city: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      url: true,
      status: true,
      province: true,
      city: true,
      address: true,
      specialization: true,
      scale: true,
      notes: true,
      description: true,
      lat: true,
      lng: true,
      lastScannedAt: true,
      scanError: true,
    },
  });

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
