/**
 * Self-service demo seeder for email templates.
 *
 *   POST   /api/employer/demo/templates  → create up to 5 demo templates
 *   DELETE /api/employer/demo/templates  → remove all [Demo] templates
 *
 * Templates are marked with `name` starting with "[Demo] " so the
 * clear path can find and sweep them without touching real templates.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceCompanyId } from "@/lib/employer/admin-preview";

export const runtime = "nodejs";

const DEMO_TEMPLATES = [
  {
    kind: "rejection",
    name: "[Demo] Application Update",
    subject: "Update on your application for {{postingTitle}}",
    body: `Dear {{candidateFirstName}},

Thank you for taking the time to apply for the {{postingTitle}} position at {{companyName}}. We genuinely appreciated the opportunity to learn about your background and experience.

After careful consideration, we've decided to move forward with another candidate whose qualifications more closely align with our current needs. This was a competitive process and your application stood out in many ways.

We'll keep your profile on file and encourage you to apply for future openings at {{companyName}} — we hope our paths will cross again.

Warm regards,
The {{companyName}} Hiring Team`,
  },
  {
    kind: "interview_invite",
    name: "[Demo] Interview Invitation",
    subject: "We'd like to meet — {{postingTitle}} at {{companyName}}",
    body: `Hi {{candidateFirstName}},

Congratulations — after reviewing your application for {{postingTitle}} at {{companyName}}, we'd love to schedule a conversation with you. You can pick a time that works best using the link below.

{{calendarLink}}

The interview will be conducted via {{interviewFormat}} and is expected to last approximately 30 minutes. You'll be speaking with {{hiringManagerName}}, who leads this hiring process and is excited to learn more about your experience.

Please don't hesitate to reach out if you have any questions beforehand. We look forward to speaking with you!

Best,
The {{companyName}} Hiring Team`,
  },
  {
    kind: "offer",
    name: "[Demo] Offer Letter",
    subject: "Your offer from {{companyName}}",
    body: `Dear {{candidateFirstName}},

On behalf of everyone at {{companyName}}, we are thrilled to extend this formal offer for the {{postingTitle}} position. We were impressed by your qualifications and are confident you will make a meaningful contribution to our team.

**Offer Details**
• Compensation: {{compensation}}
• Duration: {{duration}}
• Start date: {{startDate}}
• Location: {{location}}

To accept this offer, please reply to this message or sign the attached agreement by {{offerDeadline}}. If you have questions about the terms, please contact us and we will be happy to discuss.

We very much look forward to welcoming you aboard.

Sincerely,
{{hiringManagerName}}
{{companyName}}`,
  },
  {
    kind: "follow_up",
    name: "[Demo] Application Received",
    subject: "Application received — {{postingTitle}}",
    body: `Hi {{candidateFirstName}},

Thank you for applying to the {{postingTitle}} role at {{companyName}}! We've received your application and our team will be reviewing it shortly.

You can expect to hear back from us within 5–7 business days. In the meantime, if you have any questions, feel free to reply to this message.

Thanks again for your interest — we appreciate the time you put into your application.

The {{companyName}} Hiring Team`,
  },
  {
    kind: "general",
    name: "[Demo] Custom Outreach",
    subject: "Reaching out about {{postingTitle}}",
    body: `Hi {{candidateFirstName}},

I'm reaching out regarding the {{postingTitle}} opportunity at {{companyName}}. [Add your custom message here.]

Please let me know if you have any questions or would like to discuss further.

Best,
{{hiringManagerName}}
{{companyName}}`,
  },
];

export async function POST() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const realRole = (session.user as { realRole?: string }).realRole ?? role;
  const companyId = await resolveWorkspaceCompanyId(userId, realRole);
  if (!companyId) {
    return NextResponse.json({ error: "No company workspace found." }, { status: 400 });
  }

  // Find existing [Demo] template names for this company so we can skip dupes.
  const existingDemoTemplates = await prisma.emailTemplate.findMany({
    where: { companyId, name: { startsWith: "[Demo] " } },
    select: { name: true },
  });
  const existingNames = new Set(existingDemoTemplates.map((t) => t.name));

  let created = 0;
  for (const tpl of DEMO_TEMPLATES) {
    if (existingNames.has(tpl.name)) continue;
    await prisma.emailTemplate.create({
      data: {
        companyId,
        createdById: userId,
        name: tpl.name,
        kind: tpl.kind,
        subject: tpl.subject,
        body: tpl.body,
        isStarter: false,
        starterVersion: null,
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}

export async function DELETE() {
  const session = await getSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const userId = (session?.user as { id?: string })?.id;
  if (!session || !userId || (role !== "employer" && !["admin", "superadmin"].includes(role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const realRole = (session.user as { realRole?: string }).realRole ?? role;
  const companyId = await resolveWorkspaceCompanyId(userId, realRole);
  if (!companyId) {
    return NextResponse.json({ error: "No company workspace found." }, { status: 400 });
  }

  const result = await prisma.emailTemplate.deleteMany({
    where: { companyId, name: { startsWith: "[Demo] " } },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
