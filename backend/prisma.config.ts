import { defineConfig } from 'prisma/config';

// Prisma 7 moved the connection URL out of schema.prisma and into this config.
// We read process.env directly (rather than the `env()` helper) so that commands
// which don't need a database (e.g. `prisma generate`) don't fail when
// DATABASE_URL is unset. The fallback mirrors the app's default.
const url = process.env.DATABASE_URL ??
  'postgres://postgres:Test%40123@localhost:5432/aitivity-ledger';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url },
});
