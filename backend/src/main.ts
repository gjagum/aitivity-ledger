import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLogger } from './_middleware/logger.ts';
import { authMiddleware } from './_middleware/auth.ts';

// Vertical slices
import { tasks } from './tasks/tasks.routes.ts';
import { reports } from './reports/reports.routes.ts';
import { activity } from './activity/activity.routes.ts';
import { agents } from './agents/agents.routes.ts';
import { tenants } from './tenants/tenants.routes.ts';
import { developers } from './developers/developers.routes.ts';
import { sessions } from './sessions/sessions.routes.ts';
import { locks } from './locks/locks.routes.ts';
import { mcp } from './mcp/mcp.routes.ts';

const app = new Hono();

// Global middleware — MCP needs extra exposed headers for Streamable HTTP
app.use(
  '*',
  cors({
    origin: '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'mcp-session-id',
      'Last-Event-ID',
      'mcp-protocol-version',
    ],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
  }),
);
app.use('*', requestLogger);

// Health check (public)
app.get('/health', (c) => c.json({ status: 'ok', version: '0.2.0' }));

// Mount tenant management — admin-only (ADMIN_TOKEN Bearer), gated inside
// the sub-app via adminMiddleware.
app.route('/tenants', tenants);

// MCP Streamable HTTP (auth inside handler — Bearer tenant API key)
app.route('/mcp', mcp);

// All other routes require auth (match both /slice and /slice/*)
for (const prefix of [
  '/tasks',
  '/reports',
  '/activity',
  '/agents',
  '/developers',
  '/sessions',
  '/locks',
]) {
  app.use(prefix, authMiddleware);
  app.use(`${prefix}/*`, authMiddleware);
}

// Mount authenticated slices
app.route('/tasks', tasks);
app.route('/reports', reports);
app.route('/activity', activity);
app.route('/agents', agents);
app.route('/developers', developers);
app.route('/sessions', sessions);
app.route('/locks', locks);

const port = Number(Deno.env.get('PORT') ?? '3001');
console.log(`Activity Ledger API running on http://0.0.0.0:${port}`);
console.log(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
Deno.serve({ port }, app.fetch);
