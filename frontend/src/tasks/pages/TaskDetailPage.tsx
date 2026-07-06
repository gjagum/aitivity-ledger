import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileCode, GitBranch, AlertCircle, Trash2, MessageSquare } from 'lucide-react';
import { api } from '../../api.ts';
import { format } from 'date-fns';

interface Task {
  id: string;
  external_id: string | null;
  data: {
    summary: string;
    module?: string;
    status: string;
    agent: string;
    project?: string;
    branch?: string;
    commit?: string;
    started_at?: string;
    ended_at?: string | null;
    progress_log?: Array<{ at: string; note: string; by?: string }>;
    files_changed?: string[];
    ai_provider?: string;
    token_usage?: { input?: number; output?: number };
  };
  status: string;
  agent_name: string;
  module: string | null;
  project: string | null;
  created_at: string;
  updated_at: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  abandoned: 'bg-amber-100 text-amber-700',
};

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.tasks.get(id)
      .then((data) => setTask(data as Task))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddProgress = async () => {
    if (!id || !progressNote.trim()) return;
    try {
      await api.tasks.addProgress(id, progressNote.trim());
      setProgressNote('');
      // Refresh
      const data = await api.tasks.get(id);
      setTask(data as Task);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add progress');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this task?')) return;
    try {
      await api.tasks.delete(id);
      navigate('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (error) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
      <AlertCircle className="w-5 h-5" /> {error}
    </div>
  );
  if (!task) return <p className="text-gray-500">Task not found</p>;

  const data = task.data;
  const progress = data.progress_log ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back button */}
      <button onClick={() => navigate('/tasks')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to tasks
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[data.status]}`}>
                {data.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-400 font-mono">{task.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{data.summary}</h1>
          </div>
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {data.agent}
          </span>
          {data.module && (
            <span className="flex items-center gap-1.5">
              <FileCode className="w-4 h-4" /> {data.module}
            </span>
          )}
          {data.project && (
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" /> {data.project}
            </span>
          )}
        </div>

        {data.started_at && (
          <p className="mt-4 text-xs text-gray-400">
            Started {format(new Date(data.started_at), 'MMM d, yyyy HH:mm')}
            {data.ended_at && ` · Ended ${format(new Date(data.ended_at), 'MMM d, yyyy HH:mm')}`}
          </p>
        )}
      </div>

      {/* Progress log */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Progress Log</h2>
        <div className="space-y-4">
          {progress.length === 0 ? (
            <p className="text-sm text-gray-400">No progress entries yet.</p>
          ) : (
            progress.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2" />
                  {i < progress.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm text-gray-700">{entry.note}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(entry.at), 'MMM d, HH:mm')}
                    {entry.by && ` · by ${entry.by}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add progress */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={progressNote}
            onChange={(e) => setProgressNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddProgress()}
            placeholder="Add a progress update..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddProgress}
            disabled={!progressNote.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Files changed */}
      {data.files_changed && data.files_changed.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Files Changed</h2>
          <div className="space-y-1">
            {data.files_changed.map((file, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <FileCode className="w-4 h-4 text-gray-400" />
                <code className="font-mono text-xs">{file}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
