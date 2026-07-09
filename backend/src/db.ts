import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client.ts';
import type { Prisma } from '../generated/client.ts';

function resolveConnectionString(): string {
  const raw = Deno.env.get('DATABASE_URL') ??
    'postgres://ledger:ledger@localhost:5432/ledger';
  // Prefer IPv4 loopback — avoids occasional localhost/IPv6 stalls under Deno.
  return raw.replace('@localhost:', '@127.0.0.1:').replace('@localhost/', '@127.0.0.1/');
}

const connectionString = resolveConnectionString();

// Shared pool for Prisma + hot-path raw SQL (auth / list endpoints).
// Raw pg queries stay fast even when Prisma's adapter path stalls under Deno.
export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5_000,
  application_name: 'aitivity-ledger',
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err.message);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

// Cast a dynamic value into Prisma's JSON input type.
export const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;
