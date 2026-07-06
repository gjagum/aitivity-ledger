// MCP Server for Activity Ledger
// Thin wrapper that exposes AI-native tools → REST API calls
// Start with: deno run -A mcp/server.ts

const BASE_URL = Deno.env.get('API_BASE_URL') ?? 'http://localhost:3001';

interface McpToolRequest {
  type: 'tool_call';
  tool: string;
  args: Record<string, unknown>;
  id: string;
}

interface McpToolResponse {
  type: 'tool_result';
  tool: string;
  result: unknown;
  id: string;
  error?: string;
}

async function callApi(method: string, path: string, body?: unknown, apiKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}

// Available MCP tools
const TOOLS: Record<string, (args: Record<string, unknown>, key: string) => Promise<unknown>> = {
  async task_start(args, key) {
    return callApi('POST', '/tasks', {
      data: {
        summary: args.summary,
        module: args.module,
        status: 'in_progress',
        agent: args.agent,
        project: args.project,
        branch: args.branch,
        started_at: new Date().toISOString(),
        progress_log: args.summary
          ? [{ at: new Date().toISOString(), note: `Started: ${args.summary}`, by: args.agent }]
          : [],
      },
    }, key);
  },

  async task_end(args, key) {
    return callApi('PATCH', `/tasks/${args.task_id}`, {
      data: {
        status: 'done',
        ended_at: new Date().toISOString(),
        agent: args.agent,
      },
    }, key);
  },

  async task_progress(args, key) {
    return callApi('POST', `/tasks/${args.task_id}/progress`, {
      note: args.note,
      agent: args.agent,
    }, key);
  },

  async task_list(args, key) {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.agent) params.set('agent', args.agent as string);
    if (args.limit) params.set('limit', String(args.limit));
    return callApi('GET', `/tasks?${params}`, undefined, key);
  },

  async task_get(args, key) {
    return callApi('GET', `/tasks/${args.task_id}`, undefined, key);
  },

  async report_weekly(args, key) {
    const params = new URLSearchParams();
    if (args.timezone) params.set('timezone', args.timezone as string);
    return callApi('GET', `/reports/weekly?${params}`, undefined, key);
  },

  async report_weekly_detail(args, key) {
    const params = new URLSearchParams();
    if (args.timezone) params.set('timezone', args.timezone as string);
    return callApi('GET', `/reports/weekly/detail?${params}`, undefined, key);
  },

  async report_agents(args, key) {
    return callApi('GET', '/reports/agents', undefined, key);
  },

  async activity_log(args, key) {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.agent) params.set('agent', args.agent as string);
    if (args.action) params.set('action', args.action as string);
    return callApi('GET', `/activity?${params}`, undefined, key);
  },
};

// Read API key from env
const API_KEY = Deno.env.get('LEDGER_API_KEY');
if (!API_KEY) {
  console.error('LEDGER_API_KEY environment variable is required');
  Deno.exit(1);
}

// Start MCP server (stdio transport for opencode / Claude compatibility)
console.error('MCP Server starting (stdio transport)...');
console.error(`API base: ${BASE_URL}`);

// Output MCP capabilities header
const capabilities = {
  tools: Object.keys(TOOLS).map((name) => ({
    name,
    description: getToolDescription(name),
    input_schema: getToolSchema(name),
  })),
};
console.log(JSON.stringify({ type: 'capabilities', capabilities }));

// Read JSON-RPC requests from stdin
const reader = Deno.stdin.readable.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req: McpToolRequest = JSON.parse(line);
      const tool = TOOLS[req.tool];
      if (!tool) {
        console.error(JSON.stringify({
          type: 'tool_result',
          tool: req.tool,
          id: req.id,
          error: `Unknown tool: ${req.tool}`,
        }));
        continue;
      }

      const result = await tool(req.args, API_KEY);
      console.log(
        JSON.stringify(
          { type: 'tool_result', tool: req.tool, id: req.id, result } satisfies McpToolResponse,
        ),
      );
    } catch (err) {
      console.error(JSON.stringify({
        type: 'tool_result',
        tool: 'unknown',
        id: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }
}

function getToolDescription(name: string): string {
  const descriptions: Record<string, string> = {
    task_start: 'Start a new tracked task. Records agent, module, project, and initial progress.',
    task_end: 'Mark a task as done with an end timestamp.',
    task_progress: 'Append a progress note to an active task.',
    task_list: 'List tasks with optional filters (status, agent, limit).',
    task_get: 'Get a single task by ID with full JSONB data.',
    report_weekly: 'Weekly summary grouped by agent/project with counts.',
    report_weekly_detail: 'All tasks started this week with full details.',
    report_agents: 'Lifetime agent stats (total, completed, avg duration).',
    activity_log: 'Recent activity log events.',
  };
  return descriptions[name] ?? '';
}

function getToolSchema(name: string): Record<string, unknown> {
  const schemas: Record<string, Record<string, unknown>> = {
    task_start: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'What the task is about' },
        module: { type: 'string', description: 'File or module path' },
        agent: { type: 'string', description: 'Agent name' },
        project: { type: 'string', description: 'Project name' },
        branch: { type: 'string', description: 'Git branch' },
      },
      required: ['summary', 'agent'],
    },
    task_end: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task UUID' },
        agent: { type: 'string', description: 'Agent name' },
      },
      required: ['task_id', 'agent'],
    },
    task_progress: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task UUID' },
        note: { type: 'string', description: 'Progress update text' },
        agent: { type: 'string', description: 'Agent name' },
      },
      required: ['task_id', 'note', 'agent'],
    },
    task_list: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'done', 'blocked', 'abandoned'],
        },
        agent: { type: 'string' },
        limit: { type: 'number' },
      },
    },
    task_get: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
    report_weekly: {
      type: 'object',
      properties: { timezone: { type: 'string', default: 'UTC' } },
    },
    activity_log: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        agent: { type: 'string' },
        action: { type: 'string' },
      },
    },
  };
  return schemas[name] ?? { type: 'object', properties: {} };
}
