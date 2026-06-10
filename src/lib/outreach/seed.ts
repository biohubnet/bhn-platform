/**
 * Seed for WORKSPACE → Marketing → Outreach. Two lists:
 *   • "Cross-promotion Partners" — cleaned import of the team's
 *     "Cross-promotion Partner Contact List" CSV (stray rows dropped,
 *     whitespace fixed, the side-note column folded into Notes). Rows below
 *     the CSV's "added by Roshni" marker keep that attribution.
 *   • "EXPERIENCE Program" — separate, starts empty.
 * ensureOutreachSeed() runs on the Outreach page load; idempotent.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface OutreachColumn { key: string; label: string }

export const DEFAULT_COLUMNS: OutreachColumn[] = [
  { key: "org", label: "Org" },
  { key: "name", label: "Name" },
  { key: "title", label: "Title and Department" },
  { key: "email", label: "Email" },
  { key: "notes", label: "Notes" },
];

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

export async function ensureOutreachSeed(createdById: string | null): Promise<void> {
  const count = await prisma.outreachList.count();
  if (count > 0) return;

  const partners = await prisma.outreachList.create({
    data: {
      name: PARTNER_LIST,
      description: "Partner organisations we can reach out to for cross-promotion of BHN programs.",
      columns: DEFAULT_COLUMNS as unknown as Prisma.InputJsonValue,
      order: 0,
      createdById,
    },
  });
  await prisma.outreachContact.createMany({
    data: PARTNER_CONTACTS.map((c, i) => ({
      listId: partners.id,
      order: i,
      values: { org: c.org, name: c.name, title: c.title, email: c.email, notes: c.notes ?? "" } as unknown as Prisma.InputJsonValue,
      addedByName: c.addedBy ?? "BHN team",
    })),
  });

  await prisma.outreachList.create({
    data: {
      name: EXPERIENCE_LIST,
      description: "Contacts specifically for promoting the EXPERIENCE program.",
      columns: DEFAULT_COLUMNS as unknown as Prisma.InputJsonValue,
      order: 1,
      createdById,
    },
  });
}
