export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const posting = await prisma.internshipPosting.findFirst({
    where: { id, status: "active" },
    select: {
      id: true,
      title: true,
      companyName: true,
      website: true,
    },
  });
  if (!posting) {
    return NextResponse.json({ error: "Job posting not found or no longer active." }, { status: 404 });
  }

  let body: {
    name?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    coverLetter?: string;
    resumeUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, phone, linkedinUrl, coverLetter, resumeUrl } = body;

  // Validate required fields.
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 422 });
  }
  if (!coverLetter || coverLetter.length < 100 || coverLetter.length > 3000) {
    return NextResponse.json(
      { error: "Cover letter must be between 100 and 3000 characters." },
      { status: 422 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Duplicate check.
  const existing = await prisma.accessRequest.findFirst({
    where: {
      email: normalizedEmail,
      source: { startsWith: `job-apply-${id}` },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      message: "We already have your application on file.",
    });
  }

  // Build the message body.
  const messageParts = [`[JOB APPLICATION — ${posting.title}]\n\n${coverLetter}`];
  if (phone) messageParts.push(`\n\nPhone: ${phone}`);
  if (resumeUrl) messageParts.push(`\n\nResume: ${resumeUrl}`);
  if (linkedinUrl) messageParts.push(`\n\nLinkedIn: ${linkedinUrl}`);

  await prisma.accessRequest.create({
    data: {
      kind: "trainee",
      email: normalizedEmail,
      name: name.trim(),
      company: posting.companyName,
      website: posting.website ?? null,
      message: messageParts.join(""),
      source: `job-apply-${id}`,
      status: "pending",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Application submitted. The hiring team will review it and reach out within a few days.",
  });
}
