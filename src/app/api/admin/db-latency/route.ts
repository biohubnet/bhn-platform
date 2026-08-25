/**
 * TEMPORARY DIAGNOSTIC — benchmark database round-trip latency from inside
 * the deployed function, rather than from a developer laptop.
 *
 *   GET /api/admin/db-latency
 *
 * Why this exists: the UI was sluggish (0.75-1.5s per navigation) because
 * DATABASE_URL carried `connection_limit=1`, which serialises every query
 * onto a single connection and defeats every Promise.all in the codebase.
 * Measured from a laptop the transaction pooler (:6543) also looked ~5x
 * slower per query than the session pooler (:5432) — but laptop numbers
 * include home-network latency and are not a sound basis for changing a
 * production pooler. This endpoint measures both from the function itself.
 *
 * Superadmin only, and it never returns a connection string — only the
 * host, port and timings.
 *
 * DELETE THIS ROUTE once the pooler decision is made.
 */
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROUNDS = 10;

interface Bench {
  label: string;
  host: string;
  port: string;
  connectionLimit: string;
  connectMs: number | null;
  sequentialMsPerQuery: number | null;
  parallelTotalMs: number | null;
  error: string | null;
}

/** Strip credentials — only ever surface host, port and the pool setting. */
function describe(url: string): { host: string; port: string; connectionLimit: string } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "5432",
      connectionLimit: u.searchParams.get("connection_limit") ?? "(unset)",
    };
  } catch {
    return { host: "(unparseable)", port: "(unparseable)", connectionLimit: "(unparseable)" };
  }
}

function withLimit(url: string, limit: number): string {
  try {
    const u = new URL(url);
    u.searchParams.set("connection_limit", String(limit));
    return u.toString();
  } catch {
    return url;
  }
}

async function bench(label: string, url: string): Promise<Bench> {
  const meta = describe(url);
  const client = new PrismaClient({ datasources: { db: { url } }, log: [] });
  try {
    const t0 = Date.now();
    await client.$queryRaw`SELECT 1`;
    const connectMs = Date.now() - t0;

    const t1 = Date.now();
    for (let i = 0; i < ROUNDS; i++) await client.$queryRaw`SELECT 1`;
    const sequentialMsPerQuery = (Date.now() - t1) / ROUNDS;

    const t2 = Date.now();
    await Promise.all(Array.from({ length: ROUNDS }, () => client.$queryRaw`SELECT 1`));
    const parallelTotalMs = Date.now() - t2;

    return { label, ...meta, connectMs, sequentialMsPerQuery, parallelTotalMs, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : "unknown error";
    return { label, ...meta, connectMs: null, sequentialMsPerQuery: null, parallelTotalMs: null, error: message };
  } finally {
    await client.$disconnect();
  }
}

export async function GET() {
  await requireRole("superadmin");

  const pooled = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL;
  if (!pooled || !direct) {
    return NextResponse.json({ error: "DATABASE_URL or DIRECT_URL is not set" }, { status: 500 });
  }

  // Sequential, not Promise.all — concurrent benchmarks would contend and
  // each would measure the other's queueing rather than its own latency.
  const results: Bench[] = [];
  results.push(await bench("transaction pooler, as configured", pooled));
  results.push(await bench("transaction pooler, connection_limit=10", withLimit(pooled, 10)));
  results.push(await bench("session pooler, as configured", direct));
  results.push(await bench("session pooler, connection_limit=10", withLimit(direct, 10)));

  return NextResponse.json({
    region: process.env.VERCEL_REGION ?? "(not on Vercel)",
    roundsPerTest: ROUNDS,
    note: "Timings are from inside the deployed function. Lower is better. If parallelTotalMs is close to sequentialMsPerQuery * rounds, queries are being serialised.",
    results,
  });
}
