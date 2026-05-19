import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of service · BHN Training",
  description: "The agreement between you and BHN Training.",
};

// Stable "Last updated" string — bump this manually when the
// substantive terms change. (Rendering `new Date()` here would tick
// every refresh, which is not what a "Last updated" date means.)
const LAST_UPDATED = "May 18, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-8">
          <ArrowLeft size={12} /> Back home
        </Link>

        <h1 className="text-3xl font-bold text-fg tracking-tight">Terms of service</h1>
        <p className="text-sm text-subtle mt-1">Last updated: {LAST_UPDATED}</p>

        {/* Working-draft notice — set the expectation that this version
            is the platform's first ToS pass and is subject to revision
            (we'll formalise with counsel before any change in
            commercial terms). */}
        <div className="mt-6 rounded-md border-l-2 border-amber-400/70 bg-amber-50/60 dark:bg-amber-300/5 px-4 py-3 text-sm text-fg-muted">
          This is the platform&apos;s working first draft. We&apos;ll formalise it with counsel before
          any change in commercial terms; for now it documents how the platform is intended to be
          used and the rights and responsibilities of everyone on it.
        </div>

        <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
          <h2>1. About these terms</h2>
          <p>
            These terms (the &quot;<strong>Terms</strong>&quot;) govern your use of the BioHubNet
            Training platform at biohubnet.ca and related subdomains (&quot;<strong>BHN</strong>&quot;,
            &quot;<strong>we</strong>&quot;, &quot;<strong>us</strong>&quot;, &quot;<strong>our</strong>&quot;).
            By creating an account, signing in, or using any part of the platform, you agree to be
            bound by these Terms and by our{" "}
            <Link href="/privacy">Privacy policy</Link>.
          </p>
          <p>
            If you&apos;re using BHN on behalf of an organisation (e.g. as an employer or instructor),
            you represent that you have authority to bind that organisation to these Terms, and
            &quot;you&quot; in these Terms refers to that organisation.
          </p>

          <h2>2. Who can use BHN</h2>
          <p>
            You must be at least 13 years old to create an account. If you&apos;re under the age of
            majority in your jurisdiction (typically 18 or 19), a parent or legal guardian must
            consent on your behalf. Some features — internship matching, EQUIP funding applications,
            employer accounts — have higher eligibility thresholds described inside the platform.
          </p>

          <h2>3. Your account</h2>
          <p>
            You&apos;re responsible for:
          </p>
          <ul>
            <li>the accuracy of the information you give us at signup and afterward,</li>
            <li>keeping your password (and any two-factor codes) confidential,</li>
            <li>activity on your account, whether or not you authorised it, and</li>
            <li>letting us know promptly if you suspect unauthorised access.</li>
          </ul>
          <p>
            We may suspend or close accounts that breach these Terms, that we reasonably believe
            have been compromised, or that we&apos;re required by law to act on.
          </p>

          <h2>4. BHN Credits</h2>
          <p>
            BHN Credits are a virtual currency used inside the platform to enrol in courses and
            pathways.
          </p>
          <ul>
            <li>Credits have no cash value, are not redeemable for money, and are not transferable between users.</li>
            <li>200 credits are gifted on signup; up to 4,800 additional credits are available after an admin review.</li>
            <li>Credits may expire if your account is inactive for an extended period. We surface upcoming expirations on your dashboard before they happen.</li>
            <li>Credits we issue as a gift may be revoked if we determine the account is in breach of these Terms.</li>
            <li>Where you have paid for credits (or for any other product or service), refund eligibility is described at the point of purchase.</li>
          </ul>

          <h2>5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>use BHN to break any law or anyone&apos;s rights;</li>
            <li>impersonate someone else or misrepresent your affiliation;</li>
            <li>scrape, crawl, or automate access to the platform beyond what our public APIs and product features allow;</li>
            <li>upload material that contains malware, illegal content, or anything you don&apos;t have the right to share;</li>
            <li>disrupt the platform, attempt to gain unauthorised access, or interfere with other users;</li>
            <li>reverse-engineer, decompile, or attempt to derive the source code of any part of BHN, except as expressly permitted by law;</li>
            <li>harass, threaten, or otherwise harm other users, employers, or staff.</li>
          </ul>

          <h2>6. Your content</h2>
          <p>
            You keep ownership of the things you upload — resumes, portfolio links, Story Bank
            entries, comments, applications, profile data, video introductions. By uploading
            content, you grant BHN a worldwide, non-exclusive, royalty-free licence to host,
            store, display, and process that content for the purpose of operating the platform and
            providing it to you and to authorised viewers (e.g. employers reviewing an application
            you submit to them).
          </p>
          <p>
            You&apos;re responsible for what you upload. If you no longer want us to host a piece of
            content, you can usually delete it from your profile; otherwise contact us.
          </p>

          <h2>7. Courses and certificates</h2>
          <p>
            Course content is provided &quot;<strong>as is</strong>&quot; for educational purposes.
            Completion of a course may result in a digital certificate; certificates reflect
            successful completion of the course&apos;s assessment criteria and are <em>not</em>{" "}
            professional licences or regulatory approvals.
          </p>
          <p>
            We may revoke a certificate where there&apos;s evidence of academic dishonesty,
            misrepresentation, or violation of these Terms.
          </p>

          <h2>8. Internship matching and employer features</h2>
          <p>
            When you apply to an internship posting or appear in an employer&apos;s talent-pool
            search, you&apos;re choosing to share the relevant parts of your profile with that
            employer. BHN facilitates the introduction; the employment relationship is between you
            and the employer.
          </p>
          <p>
            BHN does not guarantee that any application will result in an interview or offer.
            Employers are responsible for their own hiring decisions and for complying with
            applicable employment, equal-opportunity, and privacy laws.
          </p>

          <h2>9. EQUIP funding applications</h2>
          <p>
            EQUIP is the programme through which BHN facilitates micro-grant applications
            (VentureConnect and VentureLift). Submitting an application is not a guarantee of an
            award. All decisions are at the discretion of the BHN admin review panel, subject to
            the published award criteria. Funds disbursed under EQUIP are subject to the separate
            grant agreement provided at award.
          </p>

          <h2>10. Privacy</h2>
          <p>
            Our handling of your personal information is described in the{" "}
            <Link href="/privacy">Privacy policy</Link>. Please review it — by using the platform
            you agree to its terms in addition to these Terms.
          </p>

          <h2>11. Third-party services</h2>
          <p>
            BHN may link to or integrate with third-party services (e.g. authentication providers,
            video hosts, course-content providers, payment processors). We aren&apos;t responsible
            for the content or practices of those services; your use of them is governed by their
            own terms.
          </p>

          <h2>12. Disclaimers</h2>
          <p>
            THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;, WITHOUT WARRANTIES OF ANY
            KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DON&apos;T WARRANT THAT THE PLATFORM WILL BE
            UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>
          <p>
            Course content is for educational purposes only and is not professional, medical, legal,
            or regulatory advice.
          </p>

          <h2>13. Limitation of liability</h2>
          <p>
            TO THE FULLEST EXTENT PERMITTED BY LAW, BHN AND ITS AFFILIATES WILL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
            DATA, REVENUE, OR PROFITS, ARISING FROM YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY TO
            YOU FOR ANY CLAIM RELATED TO THE PLATFORM WILL NOT EXCEED CAD $100, OR THE AMOUNT YOU
            PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM, WHICHEVER IS GREATER.
          </p>

          <h2>14. Termination</h2>
          <p>
            You can stop using BHN any time and delete your account from your profile settings. We
            may suspend or terminate your account if you breach these Terms, if required by law, or
            if continuing to operate the account would harm the platform or other users. Sections
            that by their nature should survive termination — content licences for material already
            shared, disclaimers, limitation of liability, governing-law clauses — will continue to
            apply.
          </p>

          <h2>15. Changes to the terms</h2>
          <p>
            We may update these Terms from time to time. If we make material changes, we&apos;ll
            surface the change in your dashboard and update the &quot;Last updated&quot; date at the
            top of this page. Your continued use of the platform after the effective date
            constitutes acceptance.
          </p>

          <h2>16. Governing law</h2>
          <p>
            These Terms are governed by the laws of the Province of Ontario and the laws of Canada
            applicable in Ontario, without regard to conflict-of-law principles. Disputes will be
            resolved in the courts located in Toronto, Ontario, except where applicable law gives
            you a right to litigate in your local courts.
          </p>

          <h2>17. Contact</h2>
          <p>
            Questions about these Terms? Reach the BHN team at{" "}
            <a href="mailto:hello@biohubnet.ca">hello@biohubnet.ca</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
