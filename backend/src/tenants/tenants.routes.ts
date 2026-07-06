import { Hono } from 'hono';
import { json, prisma } from '../db.ts';
import { CreateTenantSchema } from './tenants.schema.ts';
import type { TenantRow } from './tenants.schema.ts';

const tenants = new Hono();

// POST /tenants — create a new tenant (no auth required, admin-only in production)
tenants.post('/', async (c) => {
  const body = CreateTenantSchema.parse(await c.req.json());

  const existing = await prisma.tenant.findUnique({
    where: { slug: body.slug },
    select: { id: true },
  });
  if (existing) return c.json({ error: 'Tenant with this slug already exists' }, 409);

  const tenant = await prisma.tenant.create({
    data: {
      slug: body.slug,
      name: body.name,
      config: json(body.config ?? {}),
    },
    select: { id: true, slug: true, name: true, apiKey: true, createdAt: true },
  });

  const row: TenantRow = {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    api_key: tenant.apiKey,
    config: {},
    created_at: tenant.createdAt.toISOString(),
  };
  return c.json(row, 201);
});

// GET /tenants/:id — get tenant info (requires auth in production)
tenants.get('/:id', async (c) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: c.req.param('id') },
    select: { id: true, slug: true, name: true, createdAt: true },
  });
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);
  return c.json({
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    created_at: tenant.createdAt.toISOString(),
  });
});

export { tenants };
