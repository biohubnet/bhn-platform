import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/lms/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "user";
  const userId = (session.user as { id?: string }).id;
  const credits = userId
    ? (await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }))?.credits
    : undefined;

  return (
    <div className="flex h-screen bg-surface-1">
      <Sidebar role={role} user={session.user ?? {}} credits={credits ?? undefined} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
