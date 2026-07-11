const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function getApiKey(): string | null {
  return localStorage.getItem('ledger_api_key');
}

export function setApiKey(key: string) {
  localStorage.setItem('ledger_api_key', key);
}

export function clearApiKey() {
  localStorage.removeItem('ledger_api_key');
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// Role tracks which credential type the current Bearer key represents, so the
// router can gate admin vs tenant routes. It is not a security boundary — the
// backend enforces that — only a UX/routing hint.
const ROLE_KEY = 'ledger_role';

export type Role = 'admin' | 'tenant';

export function getRole(): Role | null {
  const r = localStorage.getItem(ROLE_KEY);
  return r === 'admin' || r === 'tenant' ? r : null;
}

export function setRole(role: Role) {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearRole() {
  localStorage.removeItem(ROLE_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getApiKey();
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401) {
    clearApiKey();
    clearRole();
    // Bounce to login on auth failure, but never reload the page we're already
    // on — otherwise a login route that 401s (e.g. validating credentials) would
    // reload itself forever (visible as constant flickering).
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// API methods organized by vertical slice
export const api = {
  // Tasks
  tasks: {
    list: (params?: { status?: string; agent?: string; project?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.agent) q.set('agent', params.agent);
      if (params?.project) q.set('project', params.project);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      return request<{ items: unknown[]; count: number }>(`GET`, `/tasks?${q}`);
    },
    get: (id: string) => request<unknown>('GET', `/tasks/${id}`),
    create: (data: { external_id?: string; data: Record<string, unknown> }) =>
      request<unknown>('POST', '/tasks', data),
    update: (id: string, data: { data: Record<string, unknown> }) =>
      request<unknown>('PATCH', `/tasks/${id}`, data),
    addProgress: (id: string, note: string, agent?: string) =>
      request<unknown>('POST', `/tasks/${id}/progress`, { note, agent }),
    delete: (id: string) => request<{ deleted: string }>('DELETE', `/tasks/${id}`),
  },

  // Reports
  reports: {
    weekly: (timezone?: string) => {
      const q = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
      return request<unknown[]>('GET', `/reports/weekly${q}`);
    },
    weeklyDetail: (timezone?: string) => {
      const q = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
      return request<unknown[]>('GET', `/reports/weekly/detail${q}`);
    },
    agents: () => request<unknown[]>('GET', '/reports/agents'),
  },

  // Activity
  activity: {
    list: (params?: { limit?: number; agent?: string; action?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.agent) q.set('agent', params.agent);
      if (params?.action) q.set('action', params.action);
      return request<unknown[]>('GET', `/activity?${q}`);
    },
  },

  // Agents
  agents: {
    list: () => request<unknown[]>('GET', '/agents'),
  },

  // Developers
  developers: {
    list: () => request<Developer[]>('GET', '/developers'),
    create: (data: { name: string; github_user?: string }) =>
      request<Developer>('POST', '/developers', data),
  },

  // Sessions (governance)
  sessions: {
    list: (
      params?: { status?: string; developer_id?: string; limit?: number; offset?: number },
      signal?: AbortSignal,
    ) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.developer_id) q.set('developer_id', params.developer_id);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      return request<{ items: DevSession[]; count: number }>(`GET`, `/sessions?${q}`, undefined, signal);
    },
    get: (id: string, signal?: AbortSignal) =>
      request<DevSession>('GET', `/sessions/${id}`, undefined, signal),
    open: (data: {
      developer_name: string;
      module: string;
      branch: string;
      plan?: string[];
      github_user?: string;
    }) => request<DevSession>('POST', '/sessions', data),
    close: (
      id: string,
      data?: {
        credits_used?: number;
        ready_to_merge?: boolean;
        merge_reason?: string;
        handover_notes?: string;
      },
    ) => request<DevSession>('POST', `/sessions/${id}/close`, data ?? {}),
  },

  // File locks
  locks: {
    list: () => request<FileLock[]>('GET', '/locks'),
    check: (paths: string[]) =>
      request<Array<{ path: string; locked: boolean; lock?: FileLock }>>('POST', '/locks/check', {
        paths,
      }),
    claim: (data: {
      path: string;
      category?: string;
      developer_name: string;
      session_id?: string;
      branch: string;
      notes?: string;
    }) => request<FileLock>('POST', '/locks', data),
    release: (path: string, developer_name?: string) => {
      const q = new URLSearchParams({ path });
      if (developer_name) q.set('developer_name', developer_name);
      return request<FileLock>('DELETE', `/locks?${q}`);
    },
  },

  // Tenant (admin-only on the backend)
  tenant: {
    list: () =>
      request<{ items: TenantSummary[] }>('GET', '/tenants'),
    create: (slug: string, name: string) =>
      request<TenantDetail>('POST', '/tenants', { slug, name }),
    delete: (id: string) => request<{ deleted: string }>('DELETE', `/tenants/${id}`),
  },
};

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface TenantDetail extends TenantSummary {
  api_key: string;
  config: Record<string, unknown>;
}

export interface Developer {
  id: string;
  name: string;
  github_user: string | null;
  active: boolean;
  created_at: string;
}

export interface DevSession {
  id: string;
  number: number;
  developer_id: string;
  developer_name: string;
  module: string;
  branch: string;
  status: string;
  plan: string[];
  started_at: string;
  ended_at: string | null;
  credits_used: number | null;
  ready_to_merge: boolean;
  merge_reason: string | null;
  handover_notes: string | null;
  blockers: string | null;
  requirements?: Array<{
    id: string;
    req_id: string;
    description: string;
    status: string;
    proof: Record<string, unknown> | null;
  }>;
  files?: Array<{
    id: string;
    path: string;
    change_type: string;
    category: string;
  }>;
}

export interface FileLock {
  id: string;
  path: string;
  category: string;
  developer_id: string;
  developer_name: string;
  session_id: string | null;
  session_number: number | null;
  branch: string;
  notes: string | null;
  locked_at: string;
  released_at: string | null;
}
