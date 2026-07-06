import type { Context, Next } from 'hono';
import { prisma } from '../db.ts';

export interface TenantContext {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const apiKey = auth.slice(7);
  const tenant = await prisma.tenant.findUnique({
    where: { apiKey },
    select: { id: true, slug: true, name: true },
  });

  if (!tenant) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Tenant isolation is enforced at the application layer (each query filters
  // by tenant_id). The previous PostgreSQL RLS policies are removed because
  // Prisma cannot set the per-session tenant variable required by those policies.
  c.set('tenant', {
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    tenant_name: tenant.name,
  });

  await next();
}
