# Activity Ledger

A multi-tenant activity tracking system for AI agents. Built with Deno + Hono + PostgreSQL (JSONB) + React.

## Quick Start

```bash
# Start PostgreSQL
docker compose up postgres -d

# Run migration
cd backend && deno run -A src/migrate.ts

# Seed sample data
deno run -A src/seed.ts

# Start API server
deno run -A src/main.ts

# Start MCP server (separate terminal)
LEDGER_API_KEY=<your-api-key> deno run -A mcp/server.ts
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Projects   │────▶│  REST API    │────▶│  PostgreSQL    │
│  (opencode) │     │  (Hono)      │     │  + JSONB       │
└──────┬──────┘     └──────┬───────┘     └────────────────┘
       │                   │
       │     ┌─────────────▼─────┐
       └────▶│  MCP Server       │
             │  (stdio transport)│
             └───────────────────┘
```

## Vertical Slices

| Slice     | Backend              | Frontend                    |
|-----------|----------------------|-----------------------------|
| Tasks     | `tasks/` slice       | `tasks/pages/` + `components/` |
| Reports   | `reports/` slice     | `reports/pages/` + `components/` |
| Activity  | `activity/` slice    | Built into reports           |
| Agents    | `agents/` slice      | `agents/pages/` + `components/` |
| Tenants   | `tenants/` slice     | Sidebar API key form         |

## API Endpoints

### Tasks
- `GET /tasks` — list with filters (status, agent, project, limit, offset)
- `GET /tasks/:id` — get single task with full JSONB data
- `POST /tasks` — create task
- `PATCH /tasks/:id` — update task (merge into JSONB)
- `POST /tasks/:id/progress` — append progress entry
- `DELETE /tasks/:id` — delete task

### Reports
- `GET /reports/weekly` — per-agent summary for current week
- `GET /reports/weekly/detail` — all tasks this week
- `GET /reports/agents` — lifetime agent stats

### Activity
- `GET /activity` — recent activity log (limit, agent, action filters)

### Agents
- `GET /agents` — list agents
- `POST /agents` — register agent
- `PATCH /agents/:name` — update agent

### Tenants
- `POST /tenants` — create tenant (returns API key)
- `GET /tenants/:id` — get tenant info

## Connect from Other Projects

### Via MCP (AI-native)
Add to your project's `opencode.json`:
```json
{
  "mcp": {
    "activity-ledger": {
      "type": "remote",
      "url": "https://your-server.com/mcp",
      "headers": { "Authorization": "Bearer <tenant-api-key>" }
    }
  }
}
```

### Via REST API
```bash
curl -H "Authorization: Bearer <api-key>" http://localhost:3001/tasks
```

## JSONB Data Shape

```json
{
  "summary": "What the task is about",
  "module": "backend/src/routes/file.ts",
  "status": "in_progress",
  "agent": "main",
  "project": "team-management",
  "branch": "feat/csv-export",
  "commit": "a1b2c3d",
  "started_at": "2026-07-04T09:00:00Z",
  "ended_at": null,
  "progress_log": [
    { "at": "2026-07-04T09:00:00Z", "note": "Started working", "by": "main" }
  ],
  "files_changed": ["src/file1.ts", "src/file2.ts"],
  "ai_provider": "anthropic/claude-4",
  "token_usage": { "input": 15000, "output": 4200 }
}
```
