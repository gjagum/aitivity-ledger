import { Hono } from 'hono';
import { json, prisma } from '../db.ts';
import type { TenantContext } from '../_middleware/auth.ts';
import { CreateAgentSchema, UpdateAgentSchema } from './agents.schema.ts';
import type { AgentRow } from './agents.schema.ts';
import type { Agent } from '../../generated/client.ts';

const agents = new Hono<{ Variables: { tenant: TenantContext } }>();

function toAgentRow(a: Agent): AgentRow {
  return {
    id: a.id,
    tenant_id: a.tenantId,
    name: a.name,
    description: a.description,
    config: (a.config ?? {}) as Record<string, unknown>,
    created_at: a.createdAt.toISOString(),
  };
}

// GET /agents
agents.get('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const rows = await prisma.agent.findMany({
    where: { tenantId: tenant_id },
    orderBy: { name: 'asc' },
  });
  return c.json(rows.map(toAgentRow));
});

// POST /agents
agents.post('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = CreateAgentSchema.parse(await c.req.json());
  const agent = await prisma.agent.create({
    data: {
      tenantId: tenant_id,
      name: body.name,
      description: body.description ?? null,
      config: json(body.config ?? {}),
    },
  });
  return c.json(toAgentRow(agent), 201);
});

// PATCH /agents/:name
agents.patch('/:name', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = UpdateAgentSchema.parse(await c.req.json());

  const existing = await prisma.agent.findFirst({
    where: { tenantId: tenant_id, name: c.req.param('name') },
    select: { id: true },
  });
  if (!existing) return c.json({ error: 'Agent not found' }, 404);

  const agent = await prisma.agent.update({
    where: { id: existing.id },
    data: {
      description: body.description ?? null,
      ...(body.config !== undefined ? { config: json(body.config) } : {}),
    },
  });
  return c.json(toAgentRow(agent));
});

export { agents };
