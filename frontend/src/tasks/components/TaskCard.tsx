import { Clock, GitBranch, FileCode, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: {
    id: string;
    data: {
      summary: string;
      module?: string;
      status: string;
      agent: string;
      project?: string;
      started_at?: string;
      progress_log?: Array<{ at: string; note: string }>;
      files_changed?: string[];
    };
    status: string;
    agent_name: string;
    module: string | null;
    project: string | null;
    created_at: string;
  };
}

const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  abandoned: 'bg-amber-100 text-amber-700',
};

export function TaskCard({ task }: TaskCardProps) {
  const data = task.data;
  const progress = data.progress_log ?? [];
  const latestProgress = progress[progress.length - 1];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[data.status] ?? statusStyles.pending}`}>
              {data.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-400 font-mono">{task.id.slice(0, 8)}</span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{data.summary}</h3>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {data.started_at ? formatDistanceToNow(new Date(data.started_at), { addSuffix: true }) : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {data.agent}
        </span>
        {data.module && (
          <span className="flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5" />
            {data.module}
          </span>
        )}
        {data.project && (
          <span className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" />
            {data.project}
          </span>
        )}
        {data.files_changed && data.files_changed.length > 0 && (
          <span className="text-gray-400">
            {data.files_changed.length} file{data.files_changed.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {latestProgress && data.status === 'blocked' && (
        <div className="flex items-start gap-2 mt-3 p-2.5 bg-red-50 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{latestProgress.note}</span>
        </div>
      )}
    </div>
  );
}
