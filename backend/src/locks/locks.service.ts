import { prisma } from '../db.ts';
import type { FileLock } from '../../generated/client.ts';
import { ensureDeveloper } from '../developers/developers.service.ts';
import type { LockConflict, LockRow } from './locks.schema.ts';

type LockWithRelations = FileLock & {
  developer: { id: string; name: string };
  session: { number: number } | null;
};

function toRow(l: LockWithRelations): LockRow {
  return {
    id: l.id,
    path: l.path,
    category: l.category,
    developer_id: l.developerId,
    developer_name: l.developer.name,
    session_id: l.sessionId,
    session_number: l.session?.number ?? null,
    branch: l.branch,
    notes: l.notes,
    locked_at: l.lockedAt.toISOString(),
    released_at: l.releasedAt?.toISOString() ?? null,
  };
}

export async function listActiveLocks(tenantId: string) {
  const rows = await prisma.fileLock.findMany({
    where: { tenantId, releasedAt: null },
    include: {
      developer: { select: { id: true, name: true } },
      session: { select: { number: true } },
    },
    orderBy: { lockedAt: 'desc' },
  });
  return rows.map(toRow);
}

export async function checkPaths(tenantId: string, paths: string[]): Promise<LockConflict[]> {
  const active = await prisma.fileLock.findMany({
    where: { tenantId, releasedAt: null, path: { in: paths } },
    include: {
      developer: { select: { id: true, name: true } },
      session: { select: { number: true } },
    },
  });
  const byPath = new Map(active.map((l) => [l.path, toRow(l)]));
  return paths.map((path) => {
    const lock = byPath.get(path);
    return lock ? { path, locked: true, lock } : { path, locked: false };
  });
}

export class LockConflictError extends Error {
  conflict: LockRow;
  constructor(conflict: LockRow) {
    super(`Path already locked by ${conflict.developer_name}: ${conflict.path}`);
    this.name = 'LockConflictError';
    this.conflict = conflict;
  }
}

export async function claimLock(
  tenantId: string,
  input: {
    path: string;
    category: string;
    developer_name: string;
    session_id?: string;
    branch: string;
    notes?: string;
  },
) {
  const developer = await ensureDeveloper(tenantId, input.developer_name);

  if (input.session_id) {
    const session = await prisma.devSession.findFirst({
      where: { id: input.session_id, tenantId },
      select: { id: true, status: true },
    });
    if (!session) throw new Error('Session not found');
    if (session.status !== 'open') throw new Error('Session is not open');
  }

  const existing = await prisma.fileLock.findFirst({
    where: { tenantId, path: input.path, releasedAt: null },
    include: {
      developer: { select: { id: true, name: true } },
      session: { select: { number: true } },
    },
  });

  if (existing) {
    // Same developer reclaiming is a no-op update
    if (existing.developerId === developer.id) {
      const updated = await prisma.fileLock.update({
        where: { id: existing.id },
        data: {
          category: input.category,
          branch: input.branch,
          notes: input.notes ?? existing.notes,
          ...(input.session_id ? { sessionId: input.session_id } : {}),
        },
        include: {
          developer: { select: { id: true, name: true } },
          session: { select: { number: true } },
        },
      });
      return toRow(updated);
    }
    throw new LockConflictError(toRow(existing));
  }

  const row = await prisma.fileLock.create({
    data: {
      tenantId,
      path: input.path,
      category: input.category,
      developerId: developer.id,
      sessionId: input.session_id ?? null,
      branch: input.branch,
      notes: input.notes ?? null,
    },
    include: {
      developer: { select: { id: true, name: true } },
      session: { select: { number: true } },
    },
  });

  return toRow(row);
}

export async function releaseLock(tenantId: string, path: string, developerName?: string) {
  const existing = await prisma.fileLock.findFirst({
    where: { tenantId, path, releasedAt: null },
    include: {
      developer: { select: { id: true, name: true } },
      session: { select: { number: true } },
    },
  });
  if (!existing) return null;

  if (developerName && existing.developer.name !== developerName) {
    throw new Error(
      `Lock owned by ${existing.developer.name}; ${developerName} cannot release it`,
    );
  }

  const row = await prisma.fileLock.update({
    where: { id: existing.id },
    data: { releasedAt: new Date() },
    include: {
      developer: { select: { id: true, name: true } },
      session: { select: { number: true } },
    },
  });
  return toRow(row);
}

export async function releaseSessionLocks(tenantId: string, sessionId: string) {
  const result = await prisma.fileLock.updateMany({
    where: { tenantId, sessionId, releasedAt: null },
    data: { releasedAt: new Date() },
  });
  return { released: result.count };
}
