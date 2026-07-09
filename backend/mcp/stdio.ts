/**
 * Optional local stdio MCP launcher for Cursor configs that cannot use HTTP.
 *
 * Prefer the in-process HTTP endpoint: http://localhost:3001/mcp
 *
 * Usage:
 *   LEDGER_API_KEY=<key> deno task mcp
 *
 * Cursor mcp.json (stdio):
 * {
 *   "mcpServers": {
 *     "aitivity-ledger": {
 *       "command": "deno",
 *       "args": ["task", "--cwd", "/path/to/aitivity-ledger/backend", "mcp"],
 *       "env": { "LEDGER_API_KEY": "<key>", "API_BASE_URL": "http://localhost:3001" }
 *     }
 *   }
 * }
 *
 * This adapter speaks MCP over stdio and proxies tool calls to the REST API
 * (so the API process must already be running).
 */
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js';
import { StdioServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/stdio.js';
import { z } from 'zod';

const BASE_URL = Deno.env.get('API_BASE_URL') ?? 'http://localhost:3001';
const API_KEY = Deno.env.get('LEDGER_API_KEY');

if (!API_KEY) {
  console.error('LEDGER_API_KEY is required');
  Deno.exit(1);
}

async function callApi(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data));
  }
  return data;
}

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: 'aitivity-ledger-stdio', version: '0.2.0' });

server.tool(
  'session_start',
  'Open a developer session via REST',
  {
    developer_name: z.string(),
    module: z.string(),
    branch: z.string(),
    plan: z.array(z.string()).optional(),
    github_user: z.string().optional(),
  },
  async (args) => text(await callApi('POST', '/sessions', args)),
);

server.tool(
  'session_list',
  'List sessions (default open)',
  { status: z.string().optional(), limit: z.number().optional() },
  async ({ status, limit }) => {
    const q = new URLSearchParams();
    q.set('status', status ?? 'open');
    if (limit) q.set('limit', String(limit));
    return text(await callApi('GET', `/sessions?${q}`));
  },
);

server.tool(
  'session_end',
  'Close a session',
  {
    session_id: z.string(),
    credits_used: z.number().optional(),
    ready_to_merge: z.boolean().optional(),
    merge_reason: z.string().optional(),
    handover_notes: z.string().optional(),
  },
  async ({ session_id, ...body }) =>
    text(await callApi('POST', `/sessions/${session_id}/close`, body)),
);

server.tool(
  'lock_claim',
  'Claim a file lock',
  {
    path: z.string(),
    developer_name: z.string(),
    branch: z.string(),
    category: z.string().optional(),
    session_id: z.string().optional(),
    notes: z.string().optional(),
  },
  async (args) => text(await callApi('POST', '/locks', args)),
);

server.tool(
  'lock_list',
  'List active locks',
  {},
  async () => text(await callApi('GET', '/locks')),
);

server.tool(
  'lock_check',
  'Check paths for locks',
  { paths: z.array(z.string()) },
  async ({ paths }) => text(await callApi('POST', '/locks/check', { paths })),
);

server.tool(
  'lock_release',
  'Release a lock',
  { path: z.string(), developer_name: z.string().optional() },
  async ({ path, developer_name }) => {
    const q = new URLSearchParams({ path });
    if (developer_name) q.set('developer_name', developer_name);
    return text(await callApi('DELETE', `/locks?${q}`));
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`aitivity-ledger stdio MCP proxy → ${BASE_URL}`);
