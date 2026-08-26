/**
 * /engage — ENGAGE Program Details & FAQ.
 *
 * Parity with the current platform's ENGAGE → "Program Details and
 * FAQ": nine collapsible questions covering access, credits and
 * leaving the programme. The ENGAGE twin of /experience's guide.
 *
 * Answers are written here rather than in a data file because several
 * embed real links, and the credit numbers are imported from the
 * modules that enforce them — CREDIT_GRANT_TTL_DAYS from the sweeper,
 * the milestone constants from lib/credits/utilization. Hardcoding
 * "365" or "2,500" here would let this page drift away from the code
 * that actually applies them.
 */
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";
import { CREDIT_GRANT_TTL_DAYS } from "@/lib/credits/expiry";
import {
  CREDIT_AWARD_TOTAL,
  CREDIT_HALFWAY_MILESTONE,
  EARLY_EXPIRY_ENFORCED,
} from "@/lib/credits/utilization";

export const dynamic = "force-dynamic";

function L({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-brand-700 font-medium hover:underline">{children}</Link>;
}

export default function EngageProgramFaqPage() {
  return (
    <div>
      <PageHero
        eyebrow={<><BookOpen size={12} /> ENGAGE</>}
        title="Program details & FAQ"
        description="How training, credits and enrolment work in the ENGAGE programme."
      />

      <div className="max-w-3xl mx-auto">
        <Accordion>
          <AccordionItem question="1. How can I access training/courses on BioHubNet?" defaultOpen>
            <p>
              Everything runs through the <L href="/courses">Course Catalog</L>. Filter by
              topic, delivery mode or provider, open a course and choose Enroll. Structured
              programmes live under <L href="/pathways">Learning Pathways</L>.
            </p>
          </AccordionItem>

          <AccordionItem question="2. How do I take On-demand Courses?">
            <p>
              On-demand courses are asynchronous — start whenever you like and work at your
              own pace. Enrol from the <L href="/courses">catalogue</L>; the course then
              appears under <L href="/my-courses">My Courses</L> and in your{" "}
              <L href="/progress">Progress Tracker</L>.
            </p>
          </AccordionItem>

          <AccordionItem question="3. How do I enroll in structured Learning Pathways/workshops?">
            <p>
              Open <L href="/pathways">Learning Pathways</L> and pick one. Each pathway shows
              whether its enrolment window is <strong>Open</strong>, <strong>Closed</strong>{" "}
              or <strong>Full</strong>. Some require approval, so your request may sit as
              pending until an administrator reviews it.
            </p>
          </AccordionItem>

          <AccordionItem question="4. How can I view what courses I have taken?">
            <p>
              Your <L href="/progress">Progress Tracker</L> lists everything completed and
              everything still in flight, and exports the completed list as a PDF. Credentials
              you have earned live under <L href="/certificates">Certificates</L>.
            </p>
          </AccordionItem>

          <AccordionItem question="5. What is the Credit Expiry Policy?">
            <p>
              Awarded credits expire <strong>{CREDIT_GRANT_TTL_DAYS} days</strong> from their
              grant date. You are emailed 90, 30 and 7 days before any expiry.
            </p>
            <p>
              The programme also sets a six-month checkpoint: if you have used fewer than{" "}
              <strong>{CREDIT_HALFWAY_MILESTONE.toLocaleString()}</strong> credits by then,
              the remainder expires early; at {CREDIT_HALFWAY_MILESTONE.toLocaleString()} or
              more they stay valid for the full year.
              {!EARLY_EXPIRY_ENFORCED && (
                <> On this build only the {CREDIT_GRANT_TTL_DAYS}-day per-grant expiry is
                automated — the six-month checkpoint is policy, not yet enforced by a job.</>
              )}{" "}
              Your standing is on the <L href="/progress">Progress Tracker</L>.
            </p>
          </AccordionItem>

          <AccordionItem question="6. What happens after I use up all my Training Credits?">
            <p>
              The full award is {CREDIT_AWARD_TOTAL.toLocaleString()} credits. Once spent you
              can still take any free course, and you can apply for more through{" "}
              <L href="/credits/apply">the credit application</L> — an administrator reviews
              each request individually.
            </p>
          </AccordionItem>

          <AccordionItem question="7. Can I purchase Training Credits?">
            <p>
              No. Credits are awarded through the ENGAGE programme, not sold. If you need more
              than your award covers, apply via{" "}
              <L href="/credits/apply">the credit application</L> and explain what you are
              trying to complete.
            </p>
          </AccordionItem>

          <AccordionItem question="8. How do I leave the ENGAGE program?">
            <p>
              Contact a BioHubNet administrator to withdraw. Your completed courses and any
              certificates you have earned remain yours; unspent credits are returned to the
              programme.
            </p>
          </AccordionItem>

          <AccordionItem question="9. Why are there 2 courses already on my Progress Tracker?">
            <p>
              New accounts are enrolled automatically in the short orientation courses that
              introduce the platform and the ENGAGE programme. They cost no credits, and they
              count toward your completed total once finished.
            </p>
          </AccordionItem>
        </Accordion>

        <p className="text-xs text-subtle mt-4">
          Still stuck? Your <L href="/profile">profile</L> has support contacts, or ask a BHN
          administrator directly.
        </p>
      </div>
    </div>
  );
}
