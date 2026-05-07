import { notFound } from "next/navigation";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSeedForm } from "@/lib/forms/registry";
import type { FormField } from "@/lib/forms/types";
import { EventFormView } from "@/components/forms/EventFormView";

export default async function FormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  const userEmail = (session!.user as { email?: string }).email ?? null;
  const isStaff = checkIsStaff(role);

  const form = await getOrSeedForm(slug);
  if (!form) notFound();

  const mySubmission = userId
    ? await prisma.eventFormSubmission.findFirst({
        where: { formId: form.id, userId },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <EventFormView
      slug={form.slug}
      title={form.title}
      description={form.description}
      fields={form.fields as unknown as FormField[]}
      active={form.active}
      isStaff={isStaff}
      userEmail={userEmail}
      previousData={
        (mySubmission?.data as Record<string, string | string[]> | null) ?? null
      }
      previousAt={mySubmission?.createdAt.toISOString() ?? null}
    />
  );
}
