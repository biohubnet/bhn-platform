/**
 * /mentorship — 1:1 Mentorship Program Details & FAQ.
 *
 * The current platform carries a "1:1 Mentorship" group in the sidebar
 * alongside ENGAGE, holding a Program Details & FAQ page and a
 * Networking entry that is greyed out there. This is the twin of that
 * FAQ page; Networking is described here as not yet open rather than
 * shipped as a link that goes nowhere.
 *
 * Advisor booking is a separate, working thing — it lives on
 * /pathways and books real AdvisorSession rows.
 */
import Link from "next/link";
import { Users } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";

export const dynamic = "force-dynamic";

function L({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-brand-700 font-medium hover:underline">{children}</Link>;
}

export default function MentorshipProgramFaqPage() {
  return (
    <div>
      <PageHero
        eyebrow={<><Users size={11} /> 1:1 Mentorship</>}
        title="Program details & FAQ"
        description="How mentorship pairing works, what to expect from a mentor, and how it differs from an advisor session."
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <Accordion>
          <AccordionItem question="1. What is the 1:1 Mentorship programme?">
            <p>
              A sustained pairing with someone already working in the part of the sector
              you are moving toward. Mentorship is about direction over months — which
              roles suit you, what a career in a given function actually looks like, how
              to read an opportunity — rather than a single answer to a single question.
            </p>
          </AccordionItem>

          <AccordionItem question="2. How is this different from booking an advisor?">
            <p>
              An advisor session is fifteen minutes about a concrete decision, usually
              which courses or which pathway to take. You can book one yourself from{" "}
              <L href="/pathways">Learning Pathways</L> and it happens that week.
              Mentorship is a longer relationship with someone in industry, arranged by
              matching rather than self-serve booking. Use an advisor for &ldquo;what
              should I take next?&rdquo; and a mentor for &ldquo;where am I heading?&rdquo;
            </p>
          </AccordionItem>

          <AccordionItem question="3. How are mentors and mentees matched?">
            <p>
              Matching considers the function you are targeting, your background, and
              the mentor&rsquo;s own route into the sector. It is deliberate rather than
              automatic — a good pairing depends on more than a shared job title, and a
              mismatched pair helps no one.
            </p>
          </AccordionItem>

          <AccordionItem question="4. What is expected of me as a mentee?">
            <p>
              Turn up, and come with something specific. The mentees who get the most
              from this arrive with a question they have already thought about, do what
              they said they would between sessions, and tell their mentor when
              something has changed. A mentor&rsquo;s time is donated; treating it as
              seriously as an interview is the least the arrangement asks.
            </p>
          </AccordionItem>

          <AccordionItem question="5. How often do we meet, and for how long?">
            <p>
              Typically once a month for around an hour, over several months. The pair
              agrees the cadence — some meet more often early on and taper, others keep
              a steady rhythm. What matters is that it is regular enough to build
              context rather than restarting the conversation every time.
            </p>
          </AccordionItem>

          <AccordionItem question="6. Does mentorship cost training credits?">
            <p>
              No. Training credits apply to courses and pathways in{" "}
              <L href="/courses">the catalogue</L>. Mentorship and advisor sessions do
              not draw on your credit balance.
            </p>
          </AccordionItem>

          <AccordionItem question="7. What about Networking?">
            <p>
              Networking is part of the mentorship pillar but is not open yet. When it
              opens it will appear in this section. Until then, the fastest route to
              people in the sector is an advisor session and the events your pathway
              cohort runs.
            </p>
          </AccordionItem>

          <AccordionItem question="8. Can I request a different mentor?">
            <p>
              Yes, and doing so early is better than persisting with a pairing that is
              not working. Say so to a BHN administrator — there is no penalty, and a
              rematch is a normal part of running the programme.
            </p>
          </AccordionItem>
        </Accordion>

        <p className="mt-6 text-sm text-muted">
          Still stuck? Your <L href="/profile">profile</L> has support contacts, or ask a
          BHN administrator directly.
        </p>
      </div>
    </div>
  );
}
