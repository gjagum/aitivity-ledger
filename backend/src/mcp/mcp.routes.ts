import { Hono } from 'hono';
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js';
import { resolveTenant, type TenantContext } from '../_middleware/auth.ts';
import { createLedgerMcpServer } from './tools.ts';

type McpVars = { tenant: TenantContext };

/**
 * Streamable HTTP MCP endpoint at /mcp.
 * Auth: Authorization: Bearer <tenant-api-key>
 *
 * Stateless: one transport + server connect per request (safe behind load balancers).
 */
const mcp = new Hono<{ Variables: McpVars }>();

mcp.all('/', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const tenant = await resolveTenant(auth.slice(7));
  if (!tenant) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  c.set('tenant', tenant);

  const server: McpServer = createLedgerMcpServer(tenant.tenant_id);
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

export { mcp };
