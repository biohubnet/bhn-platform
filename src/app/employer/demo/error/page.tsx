import Link from "next/link";
import { Clock, Sparkles, ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export default async function DemoErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const isExpired = reason === "expired";

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-6">
      <div className="max-w-md w-full bg-card border border-line rounded-2xl p-8 text-center shadow-lg">
        <Link href="/" className="inline-flex justify-center mb-4">
          <LogoMark size={32} />
        </Link>
        <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          {isExpired ? <Clock size={20} /> : <Sparkles size={20} />}
        </div>
        <h1 className="text-xl font-bold text-fg">
          {isExpired ? "Demo link expired" : "Demo link not recognised"}
        </h1>
        <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
          {isExpired
            ? "This demo workspace has reached its expiry. Reach out to your BHN contact for a fresh link — they can mint a new one in a couple of seconds."
            : "We couldn't find a demo for this URL. The link may have been retracted, or you may be on the wrong subdomain."}
        </p>
        <Link
          href="/for-employers"
          className="mt-5 inline-flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold text-sm px-5 py-2.5 rounded-lg"
        >
          Visit /for-employers <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
