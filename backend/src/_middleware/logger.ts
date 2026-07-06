import type { Context, Next } from 'hono';

export async function requestLogger(c: Context, next: Next) {
  const start = performance.now();
  await next();
  const ms = Math.round(performance.now() - start);
  const tenant = c.get('tenant') as { tenant_slug?: string } | undefined;
  const prefix = tenant ? `[${tenant.tenant_slug}]` : '[anon]';
  console.log(`${prefix} ${c.req.method} ${c.req.url} ${c.res.status} ${ms}ms`);
}
