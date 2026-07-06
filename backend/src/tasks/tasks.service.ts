import { json, prisma } from '../db.ts';
import type { TaskData } from './tasks.schema.ts';
import type { Task } from '../../generated/client.ts';

export interface TaskRow {
  id: string;
  external_id: string | null;
  data: TaskData;
  status: string;
  agent_name: string;
  module: string | null;
  project: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

function toTaskRow(t: Task): TaskRow {
  const doc = (t.data ?? {}) as TaskData;
  return {
    id: t.id,
    external_id: t.externalId,
    data: doc,
    status: t.status,
    agent_name: t.agentName,
    module: t.module,
    project: t.project,
    started_at: t.startedAt?.toISOString() ?? null,
    ended_at: t.endedAt?.toISOString() ?? null,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

// Map a TaskData document into the promoted (indexed) columns.
function promoted(d: TaskData): {
  status: string;
  agentName: string;
  module: string | null;
  project: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
} {
  return {
    status: d.status ?? 'pending',
    agentName: d.agent,
    module: d.module ?? null,
    project: d.project ?? null,
    startedAt: d.started_at ? new Date(d.started_at) : null,
    endedAt: d.ended_at ? new Date(d.ended_at) : null,
  };
}

export async function listTasks(
  tenantId: string,
  filters: { status?: string; agent?: string; project?: string; limit: number; offset: number },
) {
  const { status, agent, project, limit, offset } = filters;
  const where = {
    tenantId,
    ...(status ? { status } : {}),
    ...(agent ? { agentName: agent } : {}),
    ...(project ? { project } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.task.count({ where }),
  ]);

  return { items: items.map(toTaskRow), count: total, limit, offset };
}

export async function getTask(tenantId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
  return task ? toTaskRow(task) : null;
}

export async function createTask(
  tenantId: string,
  externalId: string | undefined,
  data: TaskData,
) {
  const task = await prisma.task.create({
    data: {
      tenantId,
      externalId,
      data: json(data),
      ...promoted(data),
    },
  });
  return toTaskRow(task);
}

export async function updateTask(
  tenantId: string,
  taskId: string,
  data: Partial<TaskData>,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return null;

  const merged = { ...(existing.data as Record<string, unknown>), ...data } as TaskData;
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      data: json(merged),
      ...promoted(merged),
    },
  });
  return toTaskRow(updated);
}

export async function appendProgress(
  tenantId: string,
  taskId: string,
  entry: { at: string; note: string; by: string },
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    select: { id: true, data: true },
  });
  if (!existing) return null;

  const doc = (existing.data as Record<string, unknown>) ?? {};
  const log = Array.isArray(doc.progress_log)
    ? [...(doc.progress_log as unknown[]), entry]
    : [entry];
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { data: json({ ...doc, progress_log: log }) },
  });
  return toTaskRow(updated);
}

export async function deleteTask(tenantId: string, taskId: string) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    select: { id: true },
  });
  if (!existing) return null;
  await prisma.task.delete({ where: { id: taskId } });
  return { id: taskId };
}

export async function logActivity(
  tenantId: string,
  action: string,
  agent: string,
  taskId?: string,
  data?: Record<string, unknown>,
) {
  await prisma.activityLog.create({
    data: {
      tenantId,
      taskId: taskId ?? null,
      agentName: agent,
      action,
      data: json(data ?? {}),
    },
  });
}
