import { Hono } from 'hono';
import type { TenantContext } from '../_middleware/auth.ts';
import { ClaimLockSchema, CheckLocksSchema } from './locks.schema.ts';
import * as service from './locks.service.ts';

const locks = new Hono<{ Variables: { tenant: TenantContext } }>();

locks.get('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  return c.json(await service.listActiveLocks(tenant_id));
});

locks.post('/check', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = CheckLocksSchema.parse(await c.req.json());
  return c.json(await service.checkPaths(tenant_id, body.paths));
});

locks.post('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = ClaimLockSchema.parse(await c.req.json());
  try {
    const row = await service.claimLock(tenant_id, body);
    return c.json(row, 201);
  } catch (err) {
    if (err instanceof service.LockConflictError) {
      return c.json({ error: err.message, conflict: err.conflict }, 409);
    }
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

locks.delete('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const path = c.req.query('path');
  const developer = c.req.query('developer_name') ?? undefined;
  if (!path) return c.json({ error: 'path query param required' }, 400);
  try {
    const row = await service.releaseLock(tenant_id, path, developer);
    if (!row) return c.json({ error: 'Active lock not found' }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 403);
  }
});

export { locks };
