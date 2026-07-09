import { Hono } from 'hono';
import type { TenantContext } from '../_middleware/auth.ts';
import { CreateDeveloperSchema, UpdateDeveloperSchema } from './developers.schema.ts';
import * as service from './developers.service.ts';

const developers = new Hono<{ Variables: { tenant: TenantContext } }>();

developers.get('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  return c.json(await service.listDevelopers(tenant_id));
});

developers.get('/:id', async (c) => {
  const { tenant_id } = c.var.tenant;
  const row = await service.getDeveloper(tenant_id, c.req.param('id'));
  if (!row) return c.json({ error: 'Developer not found' }, 404);
  return c.json(row);
});

developers.post('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = CreateDeveloperSchema.parse(await c.req.json());
  try {
    const row = await service.createDeveloper(tenant_id, body);
    return c.json(row, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return c.json({ error: 'Developer name already exists' }, 409);
    }
    throw err;
  }
});

developers.patch('/:id', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = UpdateDeveloperSchema.parse(await c.req.json());
  const row = await service.updateDeveloper(tenant_id, c.req.param('id'), body);
  if (!row) return c.json({ error: 'Developer not found' }, 404);
  return c.json(row);
});

export { developers };
