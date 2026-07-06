import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { api } from '../../api.ts';
import { TaskCard } from '../components/TaskCard.tsx';

interface Task {
  id: string;
  external_id: string | null;
  data: {
    summary: string;
    module?: string;
    status: string;
    agent: string;
    project?: string;
    started_at?: string;
    ended_at?: string | null;
    progress_log?: Array<{ at: string; note: string; by?: string }>;
    files_changed?: string[];
  };
  status: string;
  agent_name: string;
  module: string | null;
  project: string | null;
  created_at: string;
}

export function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: '', agent: '', project: '' });
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.tasks.list({
      status: filter.status || undefined,
      agent: filter.agent || undefined,
      project: filter.project || undefined,
      limit,
      offset: page * limit,
    })
      .then((data) => {
        setTasks(data.items as Task[]);
        setCount(data.count);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [filter, page]);

  const statusOptions = ['', 'pending', 'in_progress', 'done', 'blocked', 'abandoned'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">{count} total tasks</p>
        </div>
        <Link
          to="/tasks/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Task
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by agent..."
            value={filter.agent}
            onChange={(e) => { setFilter({ ...filter, agent: e.target.value }); setPage(0); }}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filter.status}
          onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s || 'All statuses'}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Project..."
          value={filter.project}
          onChange={(e) => { setFilter({ ...filter, project: e.target.value }); setPage(0); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Task list */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link key={task.id} to={`/tasks/${task.id}`}>
              <TaskCard task={task} />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {count > limit && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {page + 1} of {Math.ceil(count / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= count}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
