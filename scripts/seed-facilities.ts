/**
 * Idempotent upsert of the 69-row Canadian biomanufacturing seed
 * into the Facility table. Run:
 *
 *   npx tsx scripts/seed-facilities.ts
 *
 * Re-runnable — uses `upsert` on the unique `name` index, so a
 * fresh xlsx re-extract followed by another run will refresh
 * existing rows + insert new ones without duplicating.
 */
import { PrismaClient } from "@prisma/client";
import { FACILITY_SEED } from "../src/lib/facilities/seed-data";

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  let created = 0;
  for (const f of FACILITY_SEED) {
    const result = await prisma.facility.upsert({
      where: { name: f.name },
      update: {
        url:            f.url,
        status:         f.status,
        province:       f.province,
        city:           f.city,
        address:        f.address,
        specialization: f.specialization,
        scale:          f.scale,
        notes:          f.notes,
        lat:            f.lat,
        lng:            f.lng,
      },
      create: {
        name:           f.name,
        url:            f.url,
        status:         f.status,
        province:       f.province,
        city:           f.city,
        address:        f.address,
        specialization: f.specialization,
        scale:          f.scale,
        notes:          f.notes,
        lat:            f.lat,
        lng:            f.lng,
      },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }
  console.log(`Facility seed: ${created} created, ${updated} updated, ${FACILITY_SEED.length} total in seed.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().then(() => process.exit(1));
  });
