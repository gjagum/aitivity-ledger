import { useEffect, useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { api } from '../../api.ts';

interface ActivityEntry {
  id: string;
  task_id: string | null;
  agent_name: string;
  action: string;
  data: Record<string, unknown>;
  created_at: string;
}

const actionStyles: Record<string, string> = {
  task_start: 'bg-green-100 text-green-700',
  task_end: 'bg-blue-100 text-blue-700',
  task_progress: 'bg-amber-100 text-amber-700',
  task_status_change: 'bg-purple-100 text-purple-700',
  task_update_documents: 'bg-indigo-100 text-indigo-700',
};

export function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ action: '', agent: '' });

  useEffect(() => {
    setLoading(true);
    api.activity.list({
      limit: 100,
      action: filter.action || undefined,
      agent: filter.agent || undefined,
    })
      .then((data) => setEntries(data as ActivityEntry[]))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [filter]);

  const actionOptions = ['', 'task_start', 'task_end', 'task_progress', 'task_status_change'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-500 mt-1">Real-time event stream of all agent actions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {actionOptions.map((a) => (
            <option key={a} value={a}>{a || 'All actions'}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by agent..."
          value={filter.agent}
          onChange={(e) => setFilter({ ...filter, agent: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No activity recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionStyles[entry.action] ?? 'bg-gray-100 text-gray-700'}`}>
                {entry.action.replace(/_/g, ' ')}
              </span>
              <span className="text-sm font-mono text-xs text-gray-500">{entry.agent_name}</span>
              {entry.task_id && (
                <Link to={`/tasks/${entry.task_id}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-mono">
                  #{entry.task_id.slice(0, 8)}
                </Link>
              )}
              {entry.data && (entry.data as Record<string, string>).summary && (
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {(entry.data as Record<string, string>).summary}
                </span>
              )}
              {entry.data && (entry.data as Record<string, string>).note && (
                <span className="text-sm text-gray-500 flex-1 truncate italic">
                  "{(entry.data as Record<string, string>).note}"
                </span>
              )}
              <span className="text-xs text-gray-400 whitespace-nowrap ml-auto">
                {format(new Date(entry.created_at), 'MMM d, HH:mm:ss')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
