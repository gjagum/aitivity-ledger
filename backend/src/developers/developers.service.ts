import { prisma } from '../db.ts';
import type { Developer } from '../../generated/client.ts';
import type { DeveloperRow } from './developers.schema.ts';

function toRow(d: Developer): DeveloperRow {
  return {
    id: d.id,
    name: d.name,
    github_user: d.githubUser,
    active: d.active,
    created_at: d.createdAt.toISOString(),
  };
}

export async function listDevelopers(tenantId: string) {
  const rows = await prisma.developer.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
  return rows.map(toRow);
}

export async function getDeveloper(tenantId: string, id: string) {
  const row = await prisma.developer.findFirst({ where: { id, tenantId } });
  return row ? toRow(row) : null;
}

export async function findDeveloperByName(tenantId: string, name: string) {
  const row = await prisma.developer.findFirst({ where: { tenantId, name } });
  return row ? toRow(row) : null;
}

export async function createDeveloper(
  tenantId: string,
  data: { name: string; github_user?: string; active?: boolean },
) {
  const row = await prisma.developer.create({
    data: {
      tenantId,
      name: data.name,
      githubUser: data.github_user ?? null,
      active: data.active ?? true,
    },
  });
  return toRow(row);
}

/** Find by name or create — used by MCP session_start. */
export async function ensureDeveloper(
  tenantId: string,
  name: string,
  githubUser?: string,
) {
  const existing = await prisma.developer.findFirst({ where: { tenantId, name } });
  if (existing) return toRow(existing);
  return createDeveloper(tenantId, { name, github_user: githubUser });
}

export async function updateDeveloper(
  tenantId: string,
  id: string,
  data: { name?: string; github_user?: string | null; active?: boolean },
) {
  const existing = await prisma.developer.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.developer.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.github_user !== undefined ? { githubUser: data.github_user } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
  return toRow(row);
}
