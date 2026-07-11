import type { Context, Next } from 'hono';

// Shared-secret admin token. Required for tenant-management routes
// (create / list / delete tenants). Set via the ADMIN_TOKEN env var.
const ADMIN_TOKEN = Deno.env.get('ADMIN_TOKEN');

export async function adminMiddleware(c: Context, next: Next) {
  if (!ADMIN_TOKEN) {
    return c.json(
      { error: 'Admin endpoints disabled — ADMIN_TOKEN is not configured' },
      503,
    );
  }

  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  // Constant-time-ish compare to avoid trivial timing leaks.
  const provided = auth.slice(7);
  if (provided.length !== ADMIN_TOKEN.length || provided !== ADMIN_TOKEN) {
    return c.json({ error: 'Invalid admin token' }, 403);
  }

  await next();
}
