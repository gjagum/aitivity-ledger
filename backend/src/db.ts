import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client.ts';
import type { Prisma } from '../generated/client.ts';

const connectionString = Deno.env.get('DATABASE_URL') ??
  'postgres://ledger:ledger@localhost:5432/ledger';

// Prisma 7 requires a driver adapter for runtime database connections
// (the connection URL is no longer read from the schema).
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

// Cast a dynamic value into Prisma's JSON input type.
export const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;
