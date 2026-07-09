import type { Context, Next } from 'hono';
import { pool } from '../db.ts';

export interface TenantContext {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
}

// Cache + single-flight API-key lookups. Concurrent dashboard/StrictMode
// requests were all hitting tenants at once; when Prisma stalled, every page
// looked hung even though the sessions query itself is cheap.
const tenantCache = new Map<string, { tenant: TenantContext; expiresAt: number }>();
const inflight = new Map<string, Promise<TenantContext | null>>();
const TENANT_CACHE_TTL_MS = 10 * 60_000;

async function lookupTenant(apiKey: string): Promise<TenantContext | null> {
  // Raw SQL — avoids Prisma adapter stalls observed under Deno HTTP load.
  const { rows } = await pool.query<{ id: string; slug: string; name: string }>(
    `SELECT id, slug, name FROM tenants WHERE api_key = $1 LIMIT 1`,
    [apiKey],
  );
  const tenant = rows[0];
  if (!tenant) {
    tenantCache.delete(apiKey);
    return null;
  }

  // Tenant isolation is enforced at the application layer (each query filters
  // by tenant_id). The previous PostgreSQL RLS policies are removed because
  // Prisma cannot set the per-session tenant variable required by those policies.
  const ctx: TenantContext = {
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    tenant_name: tenant.name,
  };
  tenantCache.set(apiKey, { tenant: ctx, expiresAt: Date.now() + TENANT_CACHE_TTL_MS });
  return ctx;
}

export async function resolveTenant(apiKey: string): Promise<TenantContext | null> {
  const cached = tenantCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }

  let pending = inflight.get(apiKey);
  if (!pending) {
    pending = lookupTenant(apiKey).finally(() => {
      inflight.delete(apiKey);
    });
    inflight.set(apiKey, pending);
  }
  return pending;
}

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const tenant = await resolveTenant(auth.slice(7));
  if (!tenant) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  c.set('tenant', tenant);
  await next();
}
