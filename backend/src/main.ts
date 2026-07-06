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

const app = new Hono();

// Global middleware
app.use('*', cors({ origin: '*', credentials: true }));
app.use('*', requestLogger);

// Health check (public)
app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }));

// Mount tenant management (public — lock down in production)
app.route('/tenants', tenants);

// All other routes require auth
app.use('/tasks/*', authMiddleware);
app.use('/reports/*', authMiddleware);
app.use('/activity/*', authMiddleware);
app.use('/agents/*', authMiddleware);

// Mount authenticated slices
app.route('/tasks', tasks);
app.route('/reports', reports);
app.route('/activity', activity);
app.route('/agents', agents);

const port = Number(Deno.env.get('PORT') ?? '3001');
console.log(`Activity Ledger API running on http://0.0.0.0:${port}`);
Deno.serve({ port }, app.fetch);
