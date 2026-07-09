import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client.ts';
import type { Prisma } from '../generated/client.ts';

const connectionString = Deno.env.get('DATABASE_URL') ??
  'postgres://ledger:ledger@localhost:5432/ledger';

// Explicit pool — PrismaPg(connectionString) defaults can starve under
// concurrent dashboard requests (tasks + agents + activity).
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

// Cast a dynamic value into Prisma's JSON input type.
export const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;
