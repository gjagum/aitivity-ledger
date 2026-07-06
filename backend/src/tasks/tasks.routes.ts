import { Hono } from 'hono';
import { z } from 'zod';
import type { TenantContext } from '../_middleware/auth.ts';
import * as service from './tasks.service.ts';
import { AddProgressSchema, CreateTaskSchema, UpdateTaskSchema } from './tasks.schema.ts';

const tasks = new Hono<{ Variables: { tenant: TenantContext } }>();

// GET /tasks
tasks.get('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const query = {
    status: c.req.query('status'),
    agent: c.req.query('agent'),
    project: c.req.query('project'),
    limit: Math.min(Number(c.req.query('limit') ?? '50'), 200),
    offset: Number(c.req.query('offset') ?? '0'),
  };
  return c.json(await service.listTasks(tenant_id, query));
});

// GET /tasks/:id
tasks.get('/:id', async (c) => {
  const { tenant_id } = c.var.tenant;
  const task = await service.getTask(tenant_id, c.req.param('id'));
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json(task);
});

// POST /tasks
tasks.post('/', async (c) => {
  const { tenant_id } = c.var.tenant;
  const body = CreateTaskSchema.parse(await c.req.json());
  const task = await service.createTask(tenant_id, body.external_id, body.data);
  await service.logActivity(tenant_id, 'task_start', body.data.agent, task.id, {
    summary: body.data.summary,
  });
  return c.json(task, 201);
});

// PATCH /tasks/:id
tasks.patch('/:id', async (c) => {
  const { tenant_id } = c.var.tenant;
  const { id } = c.req.param();
  const { data } = UpdateTaskSchema.parse(await c.req.json());
  const task = await service.updateTask(tenant_id, id, data);
  if (!task) return c.json({ error: 'Task not found' }, 404);

  if (data.status) {
    await service.logActivity(tenant_id, 'task_status_change', data.agent || 'unknown', id, {
      new_status: data.status,
    });
  }
  if (data.progress_log?.length) {
    const last = data.progress_log[data.progress_log.length - 1];
    await service.logActivity(tenant_id, 'task_progress', data.agent || 'unknown', id, {
      note: last.note,
    });
  }

  return c.json(task);
});

// POST /tasks/:id/progress
tasks.post('/:id/progress', async (c) => {
  const { tenant_id } = c.var.tenant;
  const { id } = c.req.param();
  const body = AddProgressSchema.parse(await c.req.json());
  const entry = { at: new Date().toISOString(), note: body.note, by: body.agent ?? 'unknown' };
  const task = await service.appendProgress(tenant_id, id, entry);
  if (!task) return c.json({ error: 'Task not found' }, 404);
  await service.logActivity(tenant_id, 'task_progress', entry.by, id, { note: body.note });
  return c.json(task);
});

// DELETE /tasks/:id
tasks.delete('/:id', async (c) => {
  const { tenant_id } = c.var.tenant;
  const deleted = await service.deleteTask(tenant_id, c.req.param('id'));
  if (!deleted) return c.json({ error: 'Task not found' }, 404);
  return c.json({ deleted: deleted.id });
});

export { tasks };
