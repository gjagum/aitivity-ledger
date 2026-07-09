import { Hono } from 'hono';
import { prisma } from '../db.ts';
import type { TenantContext } from '../_middleware/auth.ts';
import type { AgentSummaryRow, WeeklySummaryRow } from './reports.schema.ts';

const reports = new Hono<{ Variables: { tenant: TenantContext } }>();

// GET /reports/weekly — per-agent summary for current week.
// Conditional aggregations (COUNT ... FILTER) aren't expressible with Prisma's
// groupBy, so we run raw SQL. Columns mirror the previous GENERATED columns.
reports.get('/weekly', async (c) => {
  const { tenant_id } = c.var.tenant;
  const tz = c.req.query('timezone') ?? 'UTC';

  const rows = await prisma.$queryRaw<WeeklySummaryRow[]>`
    SELECT
      project,
      agent_name AS agent,
      COUNT(*)::INT                                                  AS tasks_total,
      COUNT(*) FILTER (WHERE status = 'done')::INT                   AS tasks_done,
      COUNT(*) FILTER (WHERE status = 'blocked')::INT                AS tasks_blocked,
      COUNT(*) FILTER (WHERE status = 'in_progress')::INT            AS tasks_in_progress
    FROM tasks
    WHERE tenant_id = ${tenant_id}
      AND started_at >= (date_trunc('week', now() AT TIME ZONE ${tz})) AT TIME ZONE ${tz}
    GROUP BY 1, 2
    ORDER BY 1, 2
  `;

  return c.json(rows);
});

// GET /reports/weekly/detail — all tasks this week
reports.get('/weekly/detail', async (c) => {
  const { tenant_id } = c.var.tenant;
  const tz = c.req.query('timezone') ?? 'UTC';

  const rows = await prisma.$queryRaw`
    SELECT id, external_id, data, status, agent_name, module, project,
           started_at, ended_at, created_at
    FROM tasks
    WHERE tenant_id = ${tenant_id}
      AND started_at >= (date_trunc('week', now() AT TIME ZONE ${tz})) AT TIME ZONE ${tz}
    ORDER BY started_at DESC
  `;

  return c.json(rows);
});

// GET /reports/agents — lifetime agent stats
reports.get('/agents', async (c) => {
  const { tenant_id } = c.var.tenant;

  const rows = await prisma.$queryRaw<AgentSummaryRow[]>`
    SELECT
      agent_name,
      MIN(started_at)                                                 AS first_active,
      MAX(started_at)                                                 AS last_active,
      COUNT(*)::INT                                                   AS total_tasks,
      COUNT(*) FILTER (WHERE status = 'done')::INT                    AS completed_tasks,
      AVG(CASE
        WHEN status = 'done' AND started_at IS NOT NULL AND ended_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))
        ELSE NULL
      END)::INT                                                       AS avg_duration_seconds
    FROM tasks
    WHERE tenant_id = ${tenant_id}
    GROUP BY agent_name
    ORDER BY agent_name
  `;

  // pg may still return BigInt for aggregates — coerce for JSON.stringify.
  const safe = rows.map((row) => ({
    ...row,
    total_tasks: Number(row.total_tasks),
    completed_tasks: Number(row.completed_tasks),
    avg_duration_seconds: row.avg_duration_seconds == null
      ? null
      : Number(row.avg_duration_seconds),
  }));

  return c.json(safe);
});

export { reports };
