import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js';
import { z } from 'zod';
import * as sessionService from '../sessions/sessions.service.ts';
import * as lockService from '../locks/locks.service.ts';
import * as taskService from '../tasks/tasks.service.ts';
import * as developerService from '../developers/developers.service.ts';
import type { TaskData } from '../tasks/tasks.schema.ts';

function text(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorText(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true as const,
  };
}

/** Register governance + task tools bound to a tenant. */
export function createLedgerMcpServer(tenantId: string): McpServer {
  const server = new McpServer({
    name: 'aitivity-ledger',
    version: '0.2.0',
  });

  // ── Developers ──────────────────────────────────────────────
  server.tool(
    'developer_list',
    'List human developers for this tenant',
    {},
    async () => text(await developerService.listDevelopers(tenantId)),
  );

  server.tool(
    'developer_ensure',
    'Find or create a developer by name',
    {
      name: z.string().describe('Developer display name'),
      github_user: z.string().optional().describe('GitHub username'),
    },
    async ({ name, github_user }) =>
      text(await developerService.ensureDeveloper(tenantId, name, github_user)),
  );

  // ── Sessions (replaces TEAM_ACTIVITY_REPORT.md writes) ──────
  server.tool(
    'session_start',
    'Open a developer session (Active Sessions + OPEN block). Call at session start before feature code.',
    {
      developer_name: z.string(),
      module: z.string().describe('Module / feature area'),
      branch: z.string().describe('Git branch'),
      plan: z.array(z.string()).optional().describe('Task checklist'),
      github_user: z.string().optional(),
    },
    async (args) => text(await sessionService.openSession(tenantId, args)),
  );

  server.tool(
    'session_get',
    'Get a session by UUID or session number',
    {
      session_id: z.string().optional().describe('Session UUID'),
      session_number: z.number().int().optional().describe('Session number'),
    },
    async ({ session_id, session_number }) => {
      if (session_id) {
        const row = await sessionService.getSession(tenantId, session_id);
        return row ? text(row) : errorText('Session not found');
      }
      if (session_number !== undefined) {
        const row = await sessionService.getSessionByNumber(tenantId, session_number);
        return row ? text(row) : errorText('Session not found');
      }
      return errorText('Provide session_id or session_number');
    },
  );

  server.tool(
    'session_list',
    'List sessions (default: open / Active Sessions)',
    {
      status: z.enum(['open', 'closed', 'superseded', 'cancelled']).optional(),
      limit: z.number().int().optional(),
    },
    async ({ status, limit }) =>
      text(
        await sessionService.listSessions(tenantId, {
          status: status ?? 'open',
          limit: limit ?? 50,
          offset: 0,
        }),
      ),
  );

  server.tool(
    'session_update',
    'Update session fields (plan, blockers, merge readiness, etc.)',
    {
      session_id: z.string(),
      module: z.string().optional(),
      branch: z.string().optional(),
      plan: z.array(z.string()).optional(),
      blockers: z.string().nullable().optional(),
      ready_to_merge: z.boolean().optional(),
      merge_reason: z.string().nullable().optional(),
      handover_notes: z.string().nullable().optional(),
      credits_used: z.number().nullable().optional(),
    },
    async ({ session_id, ...data }) => {
      const row = await sessionService.updateSession(tenantId, session_id, data);
      return row ? text(row) : errorText('Session not found');
    },
  );

  server.tool(
    'session_end',
    'Close a session, release its file locks, and record credits / handover',
    {
      session_id: z.string(),
      credits_used: z.number().optional(),
      ready_to_merge: z.boolean().optional(),
      merge_reason: z.string().optional(),
      handover_notes: z.string().optional(),
      blockers: z.string().optional(),
      status: z.enum(['closed', 'superseded', 'cancelled']).optional(),
    },
    async ({ session_id, ...data }) => {
      try {
        const row = await sessionService.closeSession(tenantId, session_id, data);
        return row ? text(row) : errorText('Session not found');
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'req_upsert',
    'Create or update a requirement (REQ-NNN) with optional proof of work',
    {
      session_id: z.string(),
      req_id: z.string().describe('e.g. REQ-118-001'),
      description: z.string(),
      status: z.enum(['pending', 'complete', 'deferred', 'cancelled']).optional(),
      proof_file: z.string().optional(),
      proof_function: z.string().optional(),
      proof_trace: z.string().optional(),
    },
    async ({ session_id, req_id, description, status, proof_file, proof_function, proof_trace }) => {
      const proof =
        proof_file || proof_function || proof_trace
          ? {
            ...(proof_file ? { file: proof_file } : {}),
            ...(proof_function ? { function: proof_function } : {}),
            ...(proof_trace ? { trace: proof_trace } : {}),
          }
          : undefined;
      const row = await sessionService.upsertRequirement(tenantId, session_id, {
        req_id,
        description,
        status,
        proof,
      });
      return row ? text(row) : errorText('Session not found');
    },
  );

  server.tool(
    'session_file_add',
    'Record a file touched in this session (Files Modified table)',
    {
      session_id: z.string(),
      path: z.string(),
      change_type: z.enum(['added', 'modified', 'deleted']),
      category: z.enum(['OWNED', 'SHARED', 'CORE', 'READ_ONLY']),
    },
    async ({ session_id, ...input }) => {
      const row = await sessionService.addSessionFile(tenantId, session_id, input);
      return row ? text(row) : errorText('Session not found');
    },
  );

  // ── Locks (replaces FILE_OWNERSHIP.md writes) ───────────────
  server.tool(
    'lock_list',
    'List active file locks',
    {},
    async () => text(await lockService.listActiveLocks(tenantId)),
  );

  server.tool(
    'lock_check',
    'Check whether paths are locked before editing',
    {
      paths: z.array(z.string()).min(1),
    },
    async ({ paths }) => text(await lockService.checkPaths(tenantId, paths)),
  );

  server.tool(
    'lock_claim',
    'Claim exclusive ownership of a file path. Returns 409-style error if locked by someone else.',
    {
      path: z.string(),
      developer_name: z.string(),
      branch: z.string(),
      category: z.enum(['OWNED', 'SHARED', 'CORE', 'READ_ONLY']).optional(),
      session_id: z.string().optional(),
      notes: z.string().optional(),
    },
    async (args) => {
      try {
        const row = await lockService.claimLock(tenantId, {
          path: args.path,
          developer_name: args.developer_name,
          branch: args.branch,
          category: args.category ?? 'OWNED',
          session_id: args.session_id,
          notes: args.notes,
        });
        return text(row);
      } catch (err) {
        if (err instanceof lockService.LockConflictError) {
          return errorText(JSON.stringify({ error: err.message, conflict: err.conflict }, null, 2));
        }
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.tool(
    'lock_release',
    'Release an active lock on a path',
    {
      path: z.string(),
      developer_name: z.string().optional().describe('Must match owner if provided'),
    },
    async ({ path, developer_name }) => {
      try {
        const row = await lockService.releaseLock(tenantId, path, developer_name);
        return row ? text(row) : errorText('Active lock not found');
      } catch (err) {
        return errorText(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // ── Tasks (existing agent work units) ───────────────────────
  server.tool(
    'task_start',
    'Start a new tracked AI-agent task',
    {
      summary: z.string(),
      agent: z.string(),
      module: z.string().optional(),
      project: z.string().optional(),
      branch: z.string().optional(),
    },
    async (args) => {
      const data: TaskData = {
        summary: args.summary,
        module: args.module,
        status: 'in_progress',
        agent: args.agent,
        project: args.project,
        branch: args.branch,
        started_at: new Date().toISOString(),
        progress_log: [
          {
            at: new Date().toISOString(),
            note: `Started: ${args.summary}`,
            by: args.agent,
          },
        ],
        files_changed: [],
      };
      const task = await taskService.createTask(tenantId, undefined, data);
      await taskService.logActivity(tenantId, 'task_start', args.agent, task.id, {
        summary: args.summary,
      });
      return text(task);
    },
  );

  server.tool(
    'task_progress',
    'Append a progress note to a task',
    {
      task_id: z.string(),
      note: z.string(),
      agent: z.string(),
    },
    async ({ task_id, note, agent }) => {
      const entry = { at: new Date().toISOString(), note, by: agent };
      const task = await taskService.appendProgress(tenantId, task_id, entry);
      if (!task) return errorText('Task not found');
      await taskService.logActivity(tenantId, 'task_progress', agent, task_id, { note });
      return text(task);
    },
  );

  server.tool(
    'task_end',
    'Mark a task as done',
    {
      task_id: z.string(),
      agent: z.string(),
    },
    async ({ task_id, agent }) => {
      const task = await taskService.updateTask(tenantId, task_id, {
        status: 'done',
        ended_at: new Date().toISOString(),
        agent,
      });
      if (!task) return errorText('Task not found');
      await taskService.logActivity(tenantId, 'task_end', agent, task_id, {});
      return text(task);
    },
  );

  server.tool(
    'task_list',
    'List tasks with optional filters',
    {
      status: z.enum(['pending', 'in_progress', 'done', 'blocked', 'abandoned']).optional(),
      agent: z.string().optional(),
      limit: z.number().optional(),
    },
    async ({ status, agent, limit }) =>
      text(
        await taskService.listTasks(tenantId, {
          status,
          agent,
          limit: limit ?? 50,
          offset: 0,
        }),
      ),
  );

  server.tool(
    'task_get',
    'Get a single task by ID',
    { task_id: z.string() },
    async ({ task_id }) => {
      const task = await taskService.getTask(tenantId, task_id);
      return task ? text(task) : errorText('Task not found');
    },
  );

  return server;
}
