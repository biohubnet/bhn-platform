import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreditApplicationForm } from "@/components/lms/CreditApplicationForm";

export default async function CreditApplyPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;

  // If a pending application exists, send them back to /credits with the status card
  const pending = await prisma.creditApplication.findFirst({
    where: { userId, status: "pending" },
  });
  if (pending) redirect("/credits");

  const userName = session.user?.name ?? "";

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Apply for additional credits"
        description="Tell us a bit about how you'll use BHN Training and attach supporting documents. An admin reviews each application personally."
      />
      <CreditApplicationForm defaultName={userName} />
    </div>
  );
}
