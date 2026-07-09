import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { api, type FileLock } from '../../api.ts';

const catStyles: Record<string, string> = {
  OWNED: 'bg-indigo-50 text-indigo-700',
  SHARED: 'bg-amber-50 text-amber-800',
  CORE: 'bg-red-50 text-red-700',
  READ_ONLY: 'bg-gray-100 text-gray-600',
};

export function LocksPage() {
  const [locks, setLocks] = useState<FileLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.locks
      .list()
      .then((rows) => {
        if (!cancelled) setLocks(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">File locks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Active ownership locks (replaces FILE_OWNERSHIP.md Current Locks)
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : locks.length === 0 ? (
        <p className="text-sm text-gray-500">No active locks. Claim via MCP <code>lock_claim</code>.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Locked by</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locks.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-800 max-w-xs truncate" title={l.path}>
                    {l.path}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${catStyles[l.category] ?? ''}`}>
                      {l.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{l.developer_name}</td>
                  <td className="px-4 py-3">
                    {l.session_id && l.session_number != null ? (
                      <Link to={`/sessions/${l.session_id}`} className="text-indigo-600 hover:underline">
                        #{l.session_number}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{l.branch}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDistanceToNow(new Date(l.locked_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
