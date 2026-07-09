import { json, prisma } from '../db.ts';
import type {
  DevSession,
  SessionFile,
  SessionRequirement,
} from '../../generated/client.ts';
import { ensureDeveloper } from '../developers/developers.service.ts';
import type {
  RequirementRow,
  SessionFileRow,
  SessionRow,
} from './sessions.schema.ts';

type SessionWithRelations = DevSession & {
  developer: { id: string; name: string };
  requirements?: SessionRequirement[];
  files?: SessionFile[];
};

function toReq(r: SessionRequirement): RequirementRow {
  return {
    id: r.id,
    req_id: r.reqId,
    description: r.description,
    status: r.status,
    proof: (r.proof as Record<string, unknown> | null) ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

function toFile(f: SessionFile): SessionFileRow {
  return {
    id: f.id,
    path: f.path,
    change_type: f.changeType,
    category: f.category,
    created_at: f.createdAt.toISOString(),
  };
}

function toRow(s: SessionWithRelations, includeChildren = false): SessionRow {
  const plan = Array.isArray(s.plan) ? (s.plan as string[]) : [];
  const row: SessionRow = {
    id: s.id,
    number: s.number,
    developer_id: s.developerId,
    developer_name: s.developer.name,
    module: s.module,
    branch: s.branch,
    status: s.status,
    plan,
    started_at: s.startedAt.toISOString(),
    ended_at: s.endedAt?.toISOString() ?? null,
    credits_used: s.creditsUsed,
    ready_to_merge: s.readyToMerge,
    merge_reason: s.mergeReason,
    handover_notes: s.handoverNotes,
    blockers: s.blockers,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
  if (includeChildren) {
    row.requirements = (s.requirements ?? []).map(toReq);
    row.files = (s.files ?? []).map(toFile);
  }
  return row;
}

async function nextSessionNumber(tenantId: string): Promise<number> {
  const latest = await prisma.devSession.findFirst({
    where: { tenantId },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  return (latest?.number ?? 0) + 1;
}

export async function listSessions(
  tenantId: string,
  filters: { status?: string; developer_id?: string; limit: number; offset: number },
) {
  const where = {
    tenantId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.developer_id ? { developerId: filters.developer_id } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.devSession.findMany({
      where,
      include: { developer: { select: { id: true, name: true } } },
      orderBy: [{ number: 'desc' }],
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.devSession.count({ where }),
  ]);

  return {
    items: items.map((s) => toRow(s)),
    count: total,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export async function getSession(tenantId: string, id: string) {
  const row = await prisma.devSession.findFirst({
    where: { id, tenantId },
    include: {
      developer: { select: { id: true, name: true } },
      requirements: { orderBy: { reqId: 'asc' } },
      files: { orderBy: { createdAt: 'asc' } },
    },
  });
  return row ? toRow(row, true) : null;
}

export async function getSessionByNumber(tenantId: string, number: number) {
  const row = await prisma.devSession.findFirst({
    where: { tenantId, number },
    include: {
      developer: { select: { id: true, name: true } },
      requirements: { orderBy: { reqId: 'asc' } },
      files: { orderBy: { createdAt: 'asc' } },
    },
  });
  return row ? toRow(row, true) : null;
}

export async function openSession(
  tenantId: string,
  input: {
    developer_name: string;
    github_user?: string;
    module: string;
    branch: string;
    plan?: string[];
    started_at?: string;
  },
) {
  const developer = await ensureDeveloper(tenantId, input.developer_name, input.github_user);
  const number = await nextSessionNumber(tenantId);

  const row = await prisma.devSession.create({
    data: {
      tenantId,
      number,
      developerId: developer.id,
      module: input.module,
      branch: input.branch,
      status: 'open',
      plan: json(input.plan ?? []),
      startedAt: input.started_at ? new Date(input.started_at) : new Date(),
    },
    include: { developer: { select: { id: true, name: true } } },
  });

  await prisma.activityLog.create({
    data: {
      tenantId,
      agentName: developer.name,
      action: 'session_start',
      data: json({
        session_id: row.id,
        session_number: number,
        module: input.module,
        branch: input.branch,
      }),
    },
  });

  return toRow(row);
}

export async function updateSession(
  tenantId: string,
  id: string,
  data: {
    module?: string;
    branch?: string;
    plan?: string[];
    status?: string;
    credits_used?: number | null;
    ready_to_merge?: boolean;
    merge_reason?: string | null;
    handover_notes?: string | null;
    blockers?: string | null;
  },
) {
  const existing = await prisma.devSession.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.devSession.update({
    where: { id },
    data: {
      ...(data.module !== undefined ? { module: data.module } : {}),
      ...(data.branch !== undefined ? { branch: data.branch } : {}),
      ...(data.plan !== undefined ? { plan: json(data.plan) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.credits_used !== undefined ? { creditsUsed: data.credits_used } : {}),
      ...(data.ready_to_merge !== undefined ? { readyToMerge: data.ready_to_merge } : {}),
      ...(data.merge_reason !== undefined ? { mergeReason: data.merge_reason } : {}),
      ...(data.handover_notes !== undefined ? { handoverNotes: data.handover_notes } : {}),
      ...(data.blockers !== undefined ? { blockers: data.blockers } : {}),
    },
    include: {
      developer: { select: { id: true, name: true } },
      requirements: { orderBy: { reqId: 'asc' } },
      files: { orderBy: { createdAt: 'asc' } },
    },
  });

  return toRow(row, true);
}

export async function closeSession(
  tenantId: string,
  id: string,
  data: {
    credits_used?: number;
    ready_to_merge?: boolean;
    merge_reason?: string;
    handover_notes?: string;
    blockers?: string;
    status?: 'closed' | 'superseded' | 'cancelled';
  },
) {
  const existing = await prisma.devSession.findFirst({
    where: { id, tenantId },
    include: { developer: { select: { id: true, name: true } } },
  });
  if (!existing) return null;
  if (existing.status !== 'open') {
    throw new Error(`Session is already ${existing.status}`);
  }

  const status = data.status ?? 'closed';
  const row = await prisma.devSession.update({
    where: { id },
    data: {
      status,
      endedAt: new Date(),
      ...(data.credits_used !== undefined ? { creditsUsed: data.credits_used } : {}),
      ...(data.ready_to_merge !== undefined ? { readyToMerge: data.ready_to_merge } : {}),
      ...(data.merge_reason !== undefined ? { mergeReason: data.merge_reason } : {}),
      ...(data.handover_notes !== undefined ? { handoverNotes: data.handover_notes } : {}),
      ...(data.blockers !== undefined ? { blockers: data.blockers } : {}),
    },
    include: {
      developer: { select: { id: true, name: true } },
      requirements: { orderBy: { reqId: 'asc' } },
      files: { orderBy: { createdAt: 'asc' } },
    },
  });

  // Release all active locks held by this session
  await prisma.fileLock.updateMany({
    where: { tenantId, sessionId: id, releasedAt: null },
    data: { releasedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      tenantId,
      agentName: existing.developer.name,
      action: 'session_end',
      data: json({
        session_id: id,
        session_number: existing.number,
        status,
        ready_to_merge: row.readyToMerge,
      }),
    },
  });

  return toRow(row, true);
}

export async function upsertRequirement(
  tenantId: string,
  sessionId: string,
  input: {
    req_id: string;
    description: string;
    status?: string;
    proof?: Record<string, unknown>;
  },
) {
  const session = await prisma.devSession.findFirst({
    where: { id: sessionId, tenantId },
    select: { id: true },
  });
  if (!session) return null;

  const row = await prisma.sessionRequirement.upsert({
    where: { sessionId_reqId: { sessionId, reqId: input.req_id } },
    create: {
      sessionId,
      reqId: input.req_id,
      description: input.description,
      status: input.status ?? 'pending',
      proof: input.proof ? json(input.proof) : undefined,
    },
    update: {
      description: input.description,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.proof !== undefined ? { proof: json(input.proof) } : {}),
    },
  });

  return toReq(row);
}

export async function addSessionFile(
  tenantId: string,
  sessionId: string,
  input: { path: string; change_type: string; category: string },
) {
  const session = await prisma.devSession.findFirst({
    where: { id: sessionId, tenantId },
    select: { id: true },
  });
  if (!session) return null;

  const row = await prisma.sessionFile.create({
    data: {
      sessionId,
      path: input.path,
      changeType: input.change_type,
      category: input.category,
    },
  });
  return toFile(row);
}
