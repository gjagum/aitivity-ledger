import { Hono } from 'hono';
import type { TenantContext } from '../_middleware/auth.ts';
import {
  AddSessionFileSchema,
  CloseSessionSchema,
  OpenSessionSchema,
  UpdateSessionSchema,
  UpsertRequirementSchema,
} from './sessions.schema.ts';
import * as service from './sessions.service.ts';

const sessions = new Hono<{ Variables: { tenant: TenantContext } }>();

sessions.get('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  return c.json(
    await service.listSessions(tenant_id, {
      status: c.req.query('status'),
      developer_id: c.req.query('developer_id'),
      limit: Math.min(Number(c.req.query('limit') ?? '50'), 200),
      offset: Number(c.req.query('offset') ?? '0'),
    }),
  );
});

sessions.get('/by-number/:number', async (c) => {
  const { tenant_id } = c.var.tenant;
  const number = Number(c.req.param('number'));
  if (!Number.isFinite(number)) return c.json({ error: 'Invalid session number' }, 400);
  const row = await service.getSessionByNumber(tenant_id, number);
  if (!row) return c.json({ error: 'Session not found' }, 404);
  return c.json(row);
});

sessions.get('/:id', async (c) => {
  const { tenant_id } = c.var.tenant;
  const row = await service.getSession(tenant_id, c.req.param('id'));
  if (!row) return c.json({ error: 'Session not found' }, 404);
  return c.json(row);
});

sessions.post('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = OpenSessionSchema.parse(await c.req.json());
  const row = await service.openSession(tenant_id, body);
  return c.json(row, 201);
});

sessions.patch('/:id', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = UpdateSessionSchema.parse(await c.req.json());
  const row = await service.updateSession(tenant_id, c.req.param('id'), body);
  if (!row) return c.json({ error: 'Session not found' }, 404);
  return c.json(row);
});

sessions.post('/:id/close', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = CloseSessionSchema.parse(await c.req.json().catch(() => ({})));
  try {
    const row = await service.closeSession(tenant_id, c.req.param('id'), body);
    if (!row) return c.json({ error: 'Session not found' }, 404);
    return c.json(row);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 409);
  }
});

sessions.post('/:id/requirements', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = UpsertRequirementSchema.parse(await c.req.json());
  const row = await service.upsertRequirement(tenant_id, c.req.param('id'), body);
  if (!row) return c.json({ error: 'Session not found' }, 404);
  return c.json(row, 201);
});

sessions.post('/:id/files', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = AddSessionFileSchema.parse(await c.req.json());
  const row = await service.addSessionFile(tenant_id, c.req.param('id'), body);
  if (!row) return c.json({ error: 'Session not found' }, 404);
  return c.json(row, 201);
});

export { sessions };
