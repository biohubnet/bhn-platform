import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, ExternalLink, Lock } from "lucide-react";

export const metadata = {
  title: "Security · BHN Training",
  description:
    "How to report a vulnerability in the BHN Training Platform, plus a summary of the security controls protecting trainee, instructor, and employer data.",
};

/**
 * Public security page. Lives at /security and is announced from the
 * footer + /.well-known/security.txt (RFC 9116).
 *
 * Two audiences:
 *   • Researchers / pentesters — they need a clear non-public channel
 *     to disclose to us, plus our scope and SLAs.
 *   • Prospective partners / leadership — they want a "what protects
 *     this platform" page they can read in 60 seconds.
 *
 * Internal incident reviews live at /admin/security (admin-only).
 * This page is the *outside-in* view.
 */

const CONTACT = "security@biohubnetwork.ca";
// Bump when the policy changes; surfaced in /.well-known/security.txt
// as the Expires field reference.
const POLICY_REVIEW = "2026-11-01";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-8">
          <ArrowLeft size={12} /> Back home
        </Link>

        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex w-10 h-10 rounded-xl bg-sky-100 text-sky-700 items-center justify-center border border-sky-300">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-fg tracking-tight">Security</h1>
            <p className="text-sm text-subtle mt-1">
              Reporting vulnerabilities and what protects the platform.
            </p>
          </div>
        </div>

        {/* Disclosure box — the most-needed thing on this page. */}
        <div className="mt-8 rounded-2xl border border-sky-300 bg-sky-50/60 p-5">
          <h2 className="text-sm font-semibold text-sky-900 inline-flex items-center gap-2">
            <Mail size={14} /> Reporting a vulnerability
          </h2>
          <p className="text-sm text-sky-900/90 mt-2 leading-relaxed">
            If you believe you&apos;ve found a security issue in the BHN Training
            Platform, please email{" "}
            <a className="font-semibold underline hover:no-underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            . We&apos;ll acknowledge within <strong>72 hours</strong> and aim
            to keep you updated until the issue is resolved or formally
            declined. Do not open a public GitHub issue, and please don&apos;t
            disclose details on social media before we&apos;ve had a chance to
            patch.
          </p>
          <p className="text-xs text-sky-900/70 mt-3">
            For maximum safety with sensitive details (e.g. PoC exploit
            steps, captured tokens), encrypt the message with our{" "}
            <a
              href="/.well-known/security.txt"
              className="underline hover:no-underline"
            >
              published security.txt
            </a>{" "}
            (RFC 9116) — or just send it in plain text and we&apos;ll move to
            an encrypted channel before discussing details.
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert mt-10 max-w-none">
          <h2>What&apos;s in scope</h2>
          <p>
            Anything reachable from <code>bhn-training-platform.vercel.app</code>{" "}
            (or our custom domain when we move to one), including:
          </p>
          <ul>
            <li>Authentication and session handling</li>
            <li>Authorisation and access control (IDOR, privilege escalation)</li>
            <li>API endpoints under <code>/api/*</code></li>
            <li>File upload + storage paths</li>
            <li>SCORM content sandboxing</li>
            <li>SSRF, SQL injection, RCE, XSS, CSRF</li>
            <li>Sensitive-data exposure</li>
            <li>Misconfiguration of Vercel, Cloudflare R2, or Postgres</li>
          </ul>

          <h2>What&apos;s out of scope</h2>
          <ul>
            <li>
              Self-DoS, brute-force flooding from a single IP, or other tests
              that disrupt service for other users.
            </li>
            <li>
              Reports that require unreleased / patched versions of dependencies
              we don&apos;t use (please verify against our public{" "}
              <code>package.json</code> first).
            </li>
            <li>
              Findings already publicly disclosed (e.g. known Next.js CVEs we
              haven&apos;t yet upgraded to a fixed version) — we appreciate the
              heads-up but already have these in the upgrade queue.
            </li>
            <li>Social engineering of staff, customers, or contractors.</li>
            <li>Physical attacks against our infrastructure.</li>
          </ul>

          <h2>Safe-harbour commitment</h2>
          <p>
            If you make a good-faith effort to comply with this policy when
            researching or reporting, we will not pursue legal action against
            you under Canadian computer-crime laws or similar statutes. We
            consider your activity authorised research. We&apos;ll work with
            you on credit / public acknowledgement, and we&apos;ll never
            unilaterally disclose your identity to a third party without your
            permission.
          </p>

          <h2 className="inline-flex items-center gap-2"><Lock size={16} /> Defence in depth — what protects the platform</h2>
          <p>
            We don&apos;t publish the full architecture, but here&apos;s a
            non-exhaustive summary of the controls a researcher should expect:
          </p>
          <ul>
            <li>
              <strong>Auth.</strong> NextAuth credentials provider,
              bcrypt-hashed passwords, JWT sessions, magic-link tokens minted
              from <code>crypto.randomBytes(32)</code>.
            </li>
            <li>
              <strong>Authorisation.</strong> Role-based gates
              (trainee / evaluating / employer / instructor / admin /
              superadmin) plus per-resource ownership checks
              (<code>requireCourseOwner</code>, per-row <code>userId</code>{" "}
              filters on Prisma queries). Endpoints return <code>403</code>{" "}
              not <code>404</code> to avoid leaking resource existence.
            </li>
            <li>
              <strong>Storage.</strong> Cloudflare R2 with paths that include
              a 128-bit cryptographic random token, so URLs are unguessable
              even if a user identifier leaks. Migration to short-lived
              signed URLs on a private bucket is on the roadmap.
            </li>
            <li>
              <strong>Database.</strong> Postgres via Prisma — all queries
              parameterised, no raw string-built SQL anywhere in the
              codebase.
            </li>
            <li>
              <strong>Transport.</strong> HTTPS only, HSTS via Vercel,
              Strict-Transport-Security headers in production.
            </li>
            <li>
              <strong>Dependencies.</strong> Dependabot enabled for security
              advisories; CodeQL static-analysis runs on every pull request.
            </li>
            <li>
              <strong>Audit.</strong> All privileged actions are written to
              an audit-log table reviewable from the admin dashboard.
            </li>
          </ul>

          <h2>What we&apos;ve learned in public</h2>
          <p>
            When something material happens — to us or to a peer LMS we share
            patterns with — we publish an internal review. Our admins surface
            those at <code>/admin/security</code>. The first such review (May
            2026) covers our pre-emptive response to the Instructure / Canvas
            breach. Happy to share the report under NDA on request.
          </p>

          <h2>Hall of fame</h2>
          <p>
            None yet. If you&apos;re the first researcher to disclose a valid
            issue under this policy, we&apos;ll be delighted to credit you
            here (with your permission) and send a small thank-you.
          </p>

          <h2>Policy review</h2>
          <p>
            This page is reviewed by{" "}
            <strong>{new Date(POLICY_REVIEW).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</strong>{" "}
            or sooner if the platform&apos;s threat model materially changes.
          </p>

          <p>
            Privacy-related questions go to{" "}
            <Link href="/privacy">our privacy policy</Link>; legal questions
            go to <Link href="/terms">our terms</Link>; everything else
            security-flavoured comes here.
          </p>
        </div>

        <div className="mt-10 flex items-center gap-4 text-xs text-subtle">
          <a
            href="/.well-known/security.txt"
            className="inline-flex items-center gap-1 hover:text-fg"
          >
            security.txt <ExternalLink size={11} />
          </a>
          <span>·</span>
          <Link href="/privacy" className="hover:text-fg">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-fg">Terms</Link>
        </div>
      </div>
    </div>
  );
}
