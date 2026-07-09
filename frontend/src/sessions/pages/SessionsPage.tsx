import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { api, type DevSession } from '../../api.ts';

const statusStyles: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  closed: 'bg-green-100 text-green-700',
  superseded: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

export function SessionsPage() {
  const [status, setStatus] = useState('open');
  const [items, setItems] = useState<DevSession[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    api.sessions
      .list({ status: status || undefined, limit: 100 }, ac.signal)
      .then((res) => {
        setItems(res.items);
        setCount(res.count);
        setError(null);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Developer sessions (replaces TEAM_ACTIVITY_REPORT Active Sessions)
          </p>
        </div>
        <label className="text-sm text-gray-600">
          Status{' '}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="ml-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="superseded">Superseded</option>
            <option value="cancelled">Cancelled</option>
            <option value="">All</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No sessions. Open one via MCP <code>session_start</code>.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Developer</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/sessions/${s.id}`} className="font-medium text-indigo-600 hover:underline">
                      #{s.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{s.developer_name}</td>
                  <td className="px-4 py-3 text-gray-700">{s.module}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.branch}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[s.status] ?? 'bg-gray-100'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDistanceToNow(new Date(s.started_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
            {count} session{count === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  );
}
