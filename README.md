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

# Start API server (includes MCP at /mcp)
deno task start
```

## Architecture

```
┌─────────────┐     ┌──────────────────────────┐     ┌────────────────┐
│  Cursor /   │────▶│  REST API + MCP (/mcp)   │────▶│  PostgreSQL    │
│  Agents     │     │  (Hono, same process)    │     │                │
└─────────────┘     └──────────────────────────┘     └────────────────┘
```

## Vertical Slices

| Slice       | Backend                 | Frontend                         |
|-------------|-------------------------|----------------------------------|
| Sessions    | `sessions/`             | `sessions/pages/`                |
| Locks       | `locks/`                | `locks/pages/`                   |
| Developers  | `developers/`           | (via sessions)                   |
| Tasks       | `tasks/`                | `tasks/pages/`                   |
| Reports     | `reports/`              | `reports/pages/`                 |
| Activity    | `activity/`             | Activity page                    |
| Agents      | `agents/`               | `agents/pages/`                  |
| Tenants     | `tenants/`              | Sidebar API key form             |
| MCP         | `mcp/` (mounted `/mcp`) | —                                |

## API Endpoints

### Sessions (governance — replaces TEAM_ACTIVITY_REPORT.md)
- `GET /sessions` — list (`status`, `developer_id`, `limit`, `offset`)
- `GET /sessions/:id` — session with requirements + files
- `POST /sessions` — open session (`developer_name`, `module`, `branch`, `plan`)
- `PATCH /sessions/:id` — update session fields
- `POST /sessions/:id/close` — close session + release its locks
- `POST /sessions/:id/requirements` — upsert REQ
- `POST /sessions/:id/files` — record file touched

### Locks (governance — replaces FILE_OWNERSHIP.md)
- `GET /locks` — active locks
- `POST /locks` — claim lock (409 on conflict)
- `POST /locks/check` — `{ paths: string[] }`
- `DELETE /locks?path=…` — release lock

### Developers
- `GET /developers` — list
- `POST /developers` — create
- `PATCH /developers/:id` — update

### Tasks
- `GET /tasks` — list with filters (status, agent, project, limit, offset)
- `GET /tasks/:id` — get single task with full JSONB data
- `POST /tasks` — create task
- `PATCH /tasks/:id` — update task (merge into JSONB)
- `POST /tasks/:id/progress` — append progress entry
- `DELETE /tasks/:id` — delete task

### Reports / Activity / Agents / Tenants
Unchanged from v0.1 (`/reports/*`, `/activity`, `/agents`, `/tenants`).

## Connect from Cursor (MCP)

MCP is served **in-process** on the API:

```
http://localhost:3001/mcp
Authorization: Bearer <tenant-api-key>
```

Cursor `mcp.json` (HTTP / remote):

```json
{
  "mcpServers": {
    "aitivity-ledger": {
      "url": "http://localhost:3001/mcp",
      "headers": { "Authorization": "Bearer <tenant-api-key>" }
    }
  }
}
```

Optional stdio proxy (API must already be running):

```bash
LEDGER_API_KEY=<key> deno task mcp
```

### Governance tools (P0)
| Tool | Purpose |
|------|---------|
| `session_start` / `session_end` / `session_list` / `session_get` / `session_update` | Developer sessions |
| `req_upsert` / `session_file_add` | Requirements + files modified |
| `lock_claim` / `lock_release` / `lock_check` / `lock_list` | File ownership |
| `developer_list` / `developer_ensure` | Human developers |
| `task_*` | Existing AI-agent task tools |

### Via REST API
```bash
curl -H "Authorization: Bearer <api-key>" http://localhost:3001/sessions?status=open
curl -H "Authorization: Bearer <api-key>" http://localhost:3001/locks
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
