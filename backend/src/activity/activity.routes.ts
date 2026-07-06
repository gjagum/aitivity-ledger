import { Hono } from 'hono';
import { prisma } from '../db.ts';
import type { TenantContext } from '../_middleware/auth.ts';
import type { ActivityRow } from './activity.schema.ts';
import type { ActivityLog } from '../../generated/client.ts';

const activity = new Hono<{ Variables: { tenant: TenantContext } }>();

function toActivityRow(a: ActivityLog): ActivityRow {
  return {
    id: a.id,
    task_id: a.taskId,
    agent_name: a.agentName,
    action: a.action,
    data: (a.data ?? {}) as Record<string, unknown>,
    created_at: a.createdAt.toISOString(),
  };
}

// GET /activity — recent activity log
activity.get('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const limit = Math.min(Number(c.req.query('limit') ?? '100'), 500);
  const agent = c.req.query('agent');
  const action = c.req.query('action');

  const where = {
    tenantId: tenant_id,
    ...(agent ? { agentName: agent } : {}),
    ...(action ? { action } : {}),
  };

  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return c.json(rows.map(toActivityRow));
});

export { activity };
