import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

// xAPI LRS - Statements endpoint
export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const body = await req.json();
  const statements = Array.isArray(body) ? body : [body];

  const ids: string[] = [];

  for (const stmt of statements) {
    const id = stmt.id ?? uuidv4();
    await prisma.xapiStatement.upsert({
      where: { statementId: id },
      update: {},
      create: {
        statementId: id,
        userId,
        verb: JSON.stringify(stmt.verb),
        object: JSON.stringify(stmt.object),
        result: stmt.result ? JSON.stringify(stmt.result) : null,
        context: stmt.context ? JSON.stringify(stmt.context) : null,
        authority: stmt.authority ? JSON.stringify(stmt.authority) : null,
        timestamp: stmt.timestamp ? new Date(stmt.timestamp) : new Date(),
        version: stmt.version ?? "1.0.3",
      },
    });
    ids.push(id);
  }

  return NextResponse.json(ids, { status: 200 });
}

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const userRole = (session.user as { role?: string }).role;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const since = searchParams.get("since");
  const verbId = searchParams.get("verb");

  const statements = await prisma.xapiStatement.findMany({
    where: {
      ...(userRole !== "admin" ? { userId } : {}),
      ...(since ? { timestamp: { gte: new Date(since) } } : {}),
      ...(verbId ? { verb: { contains: verbId } } : {}),
    },
    orderBy: { stored: "desc" },
    take: limit,
  });

  const parsed = statements.map((s) => ({
    id: s.statementId,
    actor: { objectType: "Agent" },
    verb: JSON.parse(s.verb),
    object: JSON.parse(s.object),
    result: s.result ? JSON.parse(s.result) : undefined,
    context: s.context ? JSON.parse(s.context) : undefined,
    timestamp: s.timestamp,
    stored: s.stored,
    version: s.version,
  }));

  return NextResponse.json({
    statements: parsed,
    more: "",
  });
}
