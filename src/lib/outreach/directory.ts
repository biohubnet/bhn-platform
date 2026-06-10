/**
 * Outreach v2 — central contact directory.
 *
 * One OutreachPerson per real human; OutreachMembership links a person into a
 * list. SHARED fields (org/name/title/email — the global person columns,
 * stored in PlatformSetting "outreachPersonColumns") live on the person and
 * update everywhere at once; PER-LIST fields (each list's `columns`, default
 * Notes) live on the membership.
 *
 * ensureOutreachDirectory() runs on the Outreach page load:
 *   1. migrates any legacy v1 OutreachContact rows into people+memberships,
 *      deduping by e-mail (case-insensitive) so one human in several lists
 *      becomes ONE person with several memberships — then removes the legacy
 *      rows (idempotent);
 *   2. seeds the two starter lists when the feature is empty.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface OutreachColumn { key: string; label: string }

export const DEFAULT_PERSON_COLUMNS: OutreachColumn[] = [
  { key: "org", label: "Org" },
  { key: "name", label: "Name" },
  { key: "title", label: "Title and Department" },
  { key: "email", label: "Email" },
];

export const DEFAULT_MEMBERSHIP_COLUMNS: OutreachColumn[] = [
  { key: "notes", label: "Notes" },
];

const PERSON_COLUMNS_KEY = "outreachPersonColumns";

export function sanitizeColumns(input: unknown): OutreachColumn[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) return null;
  const seen = new Set<string>();
  const out: OutreachColumn[] = [];
  for (const c of input) {
    const o = c as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim().slice(0, 40) : "";
    const label = typeof o.label === "string" ? o.label.trim().slice(0, 60) : "";
    if (!key || !label || !/^[a-z0-9_-]+$/i.test(key) || seen.has(key)) return null;
    seen.add(key);
    out.push({ key, label });
  }
  return out;
}

export async function getPersonColumns(): Promise<OutreachColumn[]> {
  const row = await prisma.platformSetting.findUnique({ where: { key: PERSON_COLUMNS_KEY } }).catch(() => null);
  if (!row) return DEFAULT_PERSON_COLUMNS;
  try {
    return sanitizeColumns(JSON.parse(row.value)) ?? DEFAULT_PERSON_COLUMNS;
  } catch {
    return DEFAULT_PERSON_COLUMNS;
  }
}

export async function setPersonColumns(cols: OutreachColumn[]): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: PERSON_COLUMNS_KEY },
    update: { value: JSON.stringify(cols) },
    create: { key: PERSON_COLUMNS_KEY, value: JSON.stringify(cols) },
  });
}

export const emailKey = (v: unknown): string =>
  typeof v === "string" ? v.trim().toLowerCase() : "";

// ── Seed data (from the team's Cross-promotion Partner Contact List CSV) ──

const PARTNER_LIST = "Cross-promotion Partners";
const EXPERIENCE_LIST = "EXPERIENCE Program";

interface SeedContact { org: string; name: string; title: string; email: string; notes?: string; addedBy?: string }

const PARTNER_CONTACTS: SeedContact[] = [
  { org: "H2i", name: "Sophie Stuart-Sheppard", title: "Strategic Communications Officer", email: "sophie.stuartsheppard@utoronto.ca" },
  { org: "UTEST", name: "Samantha Goodspeed", title: "Program Coordinator, UTEST", email: "samantha.goodspeed@utoronto.ca" },
  { org: "TIAP", name: "Barry Gee", title: "Director, Public Affairs", email: "bgee@tiap.ca" },
  { org: "OBIO", name: "Mary Argent-Katwala", title: "Senior Director, Stakeholder Engagement", email: "maryargent-katwala@obio.ca", notes: "Send the materials to Mary, and ask if she can connect us with the person who handles marketing at OBIO." },
  { org: "Ontario Genomics", name: "Celia Pennimpede", title: "Project Coordinator, Investment and Venture Development", email: "cpennimpede@ontariogenomics.ca" },
  { org: "L2M", name: "Jarrod Ladouceur", title: "Industrial Partnerships Officer", email: "jarrod.ladouceur@utoronto.ca" },
  { org: "Med by Design", name: "Julie Crljen", title: "Manager, Communications at Medicine by Design", email: "julie.crljen@ccrm.ca" },
  { org: "OCI", name: "Mandeep Singh Rehal", title: "Director, Business Development", email: "msrehal@oc-innovation.ca", notes: "CC Igor Tadeu da Cunha on outreach." },
  { org: "OCI", name: "Igor Tadeu da Cunha", title: "Business Development Manager", email: "icunha@oc-innovation.ca", notes: "CC alongside Mandeep Singh Rehal." },
  { org: "TMU Biomedical Zone", name: "Stephanie Sim", title: "Program Coordinator", email: "stephanie.sim@torontomu.ca" },
  { org: "CDL", name: "Mathew Platt", title: "EQUIP Committee Member", email: "mathew.platt@creativedestructionlab.com" },
  { org: "Velocity", name: "John Dick", title: "EQUIP Committee Member", email: "john.dick1@uwaterloo.ca" },
  { org: "MaRS", name: "Richard Bozzato", title: "EQUIP Committee Member", email: "rbozzato@marsdd.com" },
  // ── below were marked "added by Roshni" in the source CSV ──
  { org: "University Health Network", name: "Alessandra Tuccitto", title: "Lead, Office of Research Trainees (ORT)", email: "alessandra.tuccitto@uhn.ca", addedBy: "Roshni" },
  { org: "SickKids", name: "Konrad Powell-Jones", title: "Director Business Development, Industry Partnerships & Commercialization (IP&C)", email: "konrad.powell-jones@sickkids.ca", addedBy: "Roshni" },
  { org: "TMU", name: "Andreia Moretzsohn", title: "Manager, iBEST, Institute for Biomedical Engineering, Science and Technology", email: "amoretzsohn@torontomu.ca", addedBy: "Roshni" },
  { org: "UofT", name: "Noufissa Kabli", title: "Associate Director, Toronto Cannabis and Cannabinoid Research Consortium", email: "noufissa.kabli@utoronto.ca", addedBy: "Roshni" },
];

// ── Ensure: migrate legacy v1 rows, then seed if empty ────────────────────

export async function ensureOutreachDirectory(createdById: string | null): Promise<void> {
  await migrateLegacyContacts();

  const [listCount, personCount] = await Promise.all([
    prisma.outreachList.count(),
    prisma.outreachPerson.count(),
  ]);
  if (listCount === 0 && personCount === 0) {
  const partners = await prisma.outreachList.create({
    data: {
      name: PARTNER_LIST,
      description: "Partner organisations we can reach out to for cross-promotion of BHN programs.",
      columns: DEFAULT_MEMBERSHIP_COLUMNS as unknown as Prisma.InputJsonValue,
      order: 0,
      createdById,
    },
  });
  for (let i = 0; i < PARTNER_CONTACTS.length; i++) {
    const c = PARTNER_CONTACTS[i];
    await prisma.outreachPerson.create({
      data: {
        values: { org: c.org, name: c.name, title: c.title, email: c.email } as unknown as Prisma.InputJsonValue,
        addedByName: c.addedBy ?? "BHN team",
        memberships: {
          create: [{
            listId: partners.id,
            order: i,
            values: { notes: c.notes ?? "" } as unknown as Prisma.InputJsonValue,
            addedByName: c.addedBy ?? "BHN team",
          }],
        },
      },
    });
  }

  await prisma.outreachList.create({
    data: {
      name: EXPERIENCE_LIST,
      description: "Contacts specifically for promoting the EXPERIENCE program.",
      columns: DEFAULT_MEMBERSHIP_COLUMNS as unknown as Prisma.InputJsonValue,
      order: 1,
      createdById,
    },
  });
  }

  await ensureEquipPartnerList(createdById);
}

// ── EQUIP Partner Contact List (xlsx import) ─────────────────────────────

const EQUIP_LIST = "EQUIP Partners";
const EQUIP_SEED_FLAG = "outreachEquipSeeded";

export const EQUIP_MEMBERSHIP_COLUMNS: OutreachColumn[] = [
  { key: "comms", label: "Comms contact" },
  { key: "notes", label: "Notes" },
];

interface EquipSeedContact { org: string; name: string; title?: string; email?: string; comms?: boolean; notes?: string }

/** Cleaned import of "EQUIP Partner Contact List.xlsx" (Sheet1). The sheet's
 *  "Comms reach out" flag column (its cell comment: "the main contact to
 *  reach out to when we ask to cross-promote our events, announcements
 *  etc.") becomes the "Comms contact" column. "Let's find the comms person
 *  at X" placeholder rows are kept as to-dos. */
const EQUIP_CONTACTS: EquipSeedContact[] = [
  { org: "CDL", name: "Mathew Platt", title: "Global Head of Venture Recruitment", email: "mathew.platt@creativedestructionlab.com", notes: "On EQUIP Committee." },
  { org: "CDL", name: "", notes: "To do: find the comms person at CDL." },
  { org: "H2i", name: "Paul Santerre", title: "Director of the Health Innovation Hub (H2i)", email: "paul.santerre@dentistry.utoronto.ca" },
  { org: "H2i", name: "Sophie Stuart-Sheppard", title: "Strategic Communications Officer", email: "sophie.stuartsheppard@utoronto.ca", comms: true },
  { org: "Hatchery", name: "", notes: "To do: find the comms person at Hatchery. LaunchLab contact." },
  { org: "Black Founder's Network", name: "", notes: "To do: find the comms person at BFN." },
  { org: "i2I", name: "Elicia Maine", title: "Associate Vice-President, Knowledge Mobilization and Innovation (AVPKMI)", email: "emaine@sfu.ca" },
  { org: "i2I", name: "James (Jim) McLellan", email: "james.mclellan@queensu.ca" },
  { org: "i2I", name: "Simon Denford", comms: true },
  { org: "L2M", name: "Jarrod Ladouceur", title: "Industrial Partnerships Officer", email: "jarrod.ladouceur@utoronto.ca", comms: true },
  { org: "MaRS", name: "", notes: "To do: find the comms person at MaRS." },
  { org: "OBIO", name: "Mary Argent-Katwala", title: "Senior Director, Stakeholder Engagement", email: "maryargent-katwala@obio.ca", comms: true },
  { org: "OBIO", name: "Garima Ghale", title: "Associate Director", email: "garimaghale@obio.ca" },
  { org: "Ontario Genomics", name: "Elizabeth Gray", title: "Director, Investment and Venture Development", email: "egray@ontariogenomics.ca" },
  { org: "Ontario Genomics", name: "Farnaz Fekri", title: "Manager Mentorship and Venture Development", email: "ffekri@ontariogenomics.ca", comms: true },
  { org: "TIAP", name: "Parimal Nathwani", title: "President and CEO", email: "pnathwani@tiap.ca" },
  { org: "TIAP", name: "Barry Gee", title: "Director, Public Affairs", email: "bgee@tiap.ca", comms: true },
  { org: "TIAP", name: "Phil Goldbach", title: "Director, Technology and Venture Development", email: "pgoldbach@tiap.ca", notes: "Signing rep on the proposal." },
  { org: "TMU DMZ", name: "", notes: "To do: find the comms person at DMZ." },
  { org: "UTEST", name: "Kurtis Scissons", title: "Director, University Ventures", email: "kurtis.scissons@utoronto.ca" },
  { org: "UTEST", name: "Samantha Goodspeed", title: "Program Coordinator", email: "samantha.goodspeed@utoronto.ca", comms: true },
  { org: "Velocity", name: "", notes: "To do: find the comms person at Velocity." },
  { org: "PRiME", name: "Natalie", comms: true },
];

/** Import the EQUIP Partner Contact List as its own list — run-once
 *  (PlatformSetting flag). People who already exist in the directory (same
 *  e-mail) gain a membership here instead of being duplicated. */
async function ensureEquipPartnerList(createdById: string | null): Promise<void> {
  const done = await prisma.platformSetting.findUnique({ where: { key: EQUIP_SEED_FLAG } }).catch(() => null);
  if (done) return;

  const order = await prisma.outreachList.count();
  const list = await prisma.outreachList.create({
    data: {
      name: EQUIP_LIST,
      description: "EQUIP partner organisations. “Comms contact” marks the person to reach out to when we cross-promote events and announcements.",
      columns: EQUIP_MEMBERSHIP_COLUMNS as unknown as Prisma.InputJsonValue,
      order,
      createdById,
    },
  });

  // Existing directory people by e-mail, so overlaps join this list instead
  // of duplicating (e.g. comms contacts already on Cross-promotion Partners).
  const people = await prisma.outreachPerson.findMany({ select: { id: true, values: true } });
  const byEmail = new Map<string, string>();
  for (const p of people) {
    const key = emailKey((p.values as Record<string, string>)?.email);
    if (key && !byEmail.has(key)) byEmail.set(key, p.id);
  }

  for (let i = 0; i < EQUIP_CONTACTS.length; i++) {
    const c = EQUIP_CONTACTS[i];
    const key = emailKey(c.email);
    let personId = key ? byEmail.get(key) : undefined;
    if (!personId) {
      const person = await prisma.outreachPerson.create({
        data: {
          values: { org: c.org, name: c.name, title: c.title ?? "", email: c.email ?? "" } as unknown as Prisma.InputJsonValue,
          addedByName: "BHN team",
        },
        select: { id: true },
      });
      personId = person.id;
      if (key) byEmail.set(key, personId);
    }
    await prisma.outreachMembership.create({
      data: {
        listId: list.id,
        personId,
        order: i,
        values: { comms: c.comms ? "Yes" : "", notes: c.notes ?? "" } as unknown as Prisma.InputJsonValue,
        addedByName: "BHN team",
      },
    }).catch(() => {});
  }

  await prisma.platformSetting.upsert({
    where: { key: EQUIP_SEED_FLAG },
    update: { value: "1" },
    create: { key: EQUIP_SEED_FLAG, value: "1" },
  });
}

/** One-time, idempotent: fold v1 OutreachContact rows into the directory,
 *  deduping by e-mail, then delete them. Lists keep their identity; their
 *  column defs are reset to membership scope (Notes). */
async function migrateLegacyContacts(): Promise<void> {
  const legacy = await prisma.outreachContact.findMany({ orderBy: [{ listId: "asc" }, { order: "asc" }] });
  if (legacy.length === 0) return;

  const personByEmail = new Map<string, string>(); // email key → person id
  for (const row of legacy) {
    const v = (typeof row.values === "object" && row.values !== null ? row.values : {}) as Record<string, string>;
    const key = emailKey(v.email) || `__solo_${row.id}`;
    let personId = personByEmail.get(key);
    if (!personId) {
      const person = await prisma.outreachPerson.create({
        data: {
          values: { org: v.org ?? "", name: v.name ?? "", title: v.title ?? "", email: v.email ?? "" } as unknown as Prisma.InputJsonValue,
          addedById: row.addedById,
          addedByName: row.addedByName,
        },
        select: { id: true },
      });
      personId = person.id;
      personByEmail.set(key, personId);
    }
    // Create the membership (skip silently if this person already sits in
    // this list — duplicate within a list collapses to one row).
    await prisma.outreachMembership.create({
      data: {
        listId: row.listId,
        personId,
        order: row.order,
        values: { notes: v.notes ?? "" } as unknown as Prisma.InputJsonValue,
        addedById: row.addedById,
        addedByName: row.addedByName,
      },
    }).catch(() => {});
  }

  // Lists now carry membership-scoped columns only.
  await prisma.outreachList.updateMany({
    data: { columns: DEFAULT_MEMBERSHIP_COLUMNS as unknown as Prisma.InputJsonValue },
  });
  await prisma.outreachContact.deleteMany({});
}
