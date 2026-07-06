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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getApiKey();
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearApiKey();
    window.location.href = '/';
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

  // Tenant
  tenant: {
    create: (slug: string, name: string) =>
      request<{ id: string; api_key: string }>('POST', '/tenants', { slug, name }),
  },
};
