import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListTodo,
  BarChart3,
  Activity,
  Bot,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  CircleDot,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../api.ts';

const SHARED_CANVAS_URL =
  'https://cursor.com/dashboard/shared-canvases?shareId=canvas-n2DXjxqsw8R3CCxsYC6HXLzb';

interface TaskItem {
  id: string;
  status: string;
  agent_name: string;
  project: string | null;
  module: string | null;
  started_at: string | null;
  data: {
    summary?: string;
    progress_log?: Array<{ at: string; note: string; by?: string }>;
  };
}

interface ActivityEntry {
  id: string;
  task_id: string | null;
  agent_name: string;
  action: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface AgentRow {
  id: string;
  name: string;
}

interface AgentProgress {
  name: string;
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  pending: number;
}

const statusStyles: Record<string, string> = {
  done: 'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-700',
  abandoned: 'bg-gray-100 text-gray-500',
};

export function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.tasks
      .list({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setTasks(res.items as TaskItem[]);
        setTotalTasks(res.count);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tasks');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTasks(false);
      });

    api.agents
      .list()
      .then((rows) => {
        if (!cancelled) setAgents(rows as AgentRow[]);
      })
      .catch(() => {
        /* agents section can stay empty */
      })
      .finally(() => {
        if (!cancelled) setLoadingAgents(false);
      });

    api.activity
      .list({ limit: 12 })
      .then((rows) => {
        if (!cancelled) setActivity(rows as ActivityEntry[]);
      })
      .catch(() => {
        /* activity is secondary */
      })
      .finally(() => {
        if (!cancelled) setLoadingActivity(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error && !loadingTasks && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const tasksInProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const tasksBlocked = tasks.filter((t) => t.status === 'blocked').length;
  const completionRate = tasks.length
    ? Math.round((tasksDone / tasks.length) * 100)
    : 0;

  const agentProgress = buildAgentProgress(tasks, agents);
  const activeTasks = tasks.filter(
    (t) => t.status === 'in_progress' || t.status === 'blocked',
  );

  const cards = [
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: ListTodo,
      color: 'text-blue-600 bg-blue-100',
      loading: loadingTasks,
    },
    {
      label: 'Completed',
      value: tasksDone,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-100',
      loading: loadingTasks,
    },
    {
      label: 'In Progress',
      value: tasksInProgress,
      icon: CircleDot,
      color: 'text-amber-600 bg-amber-100',
      loading: loadingTasks,
    },
    {
      label: 'Blocked',
      value: tasksBlocked,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100',
      loading: loadingTasks,
    },
    {
      label: 'Agents',
      value: agents.length,
      icon: Bot,
      color: 'text-purple-600 bg-purple-100',
      loading: loadingAgents,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Activity Progress</h1>
          <p className="text-gray-500 mt-1">
            Live overview of AI agent work across the ledger
          </p>
        </div>
        <a
          href={SHARED_CANVAS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Open shared canvas
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {card.loading ? '-' : card.value}
                </p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Overall completion</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Done vs remaining across all tracked tasks
            </p>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {loadingTasks ? '-' : `${completionRate}%`}
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          {!loadingTasks && tasks.length > 0 && (
            <>
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(tasksDone / tasks.length) * 100}%` }}
                title={`Done: ${tasksDone}`}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${(tasksInProgress / tasks.length) * 100}%` }}
                title={`In progress: ${tasksInProgress}`}
              />
              <div
                className="bg-red-400 h-full transition-all"
                style={{ width: `${(tasksBlocked / tasks.length) * 100}%` }}
                title={`Blocked: ${tasksBlocked}`}
              />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <LegendDot color="bg-green-500" label="Done" />
          <LegendDot color="bg-amber-400" label="In progress" />
          <LegendDot color="bg-red-400" label="Blocked" />
          <LegendDot color="bg-gray-200" label="Other / remaining" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Progress by agent</h2>
            <p className="text-xs text-gray-500 mt-0.5">Task status breakdown per agent</p>
          </div>
          {loadingTasks || loadingAgents ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : agentProgress.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No agents yet</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {agentProgress.map((agent) => {
                const donePct = agent.total
                  ? Math.round((agent.done / agent.total) * 100)
                  : 0;
                return (
                  <li key={agent.name} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-mono text-sm font-medium text-gray-900 truncate">
                          {agent.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">
                        {agent.done}/{agent.total} done · {donePct}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      {agent.total > 0 && (
                        <>
                          <div
                            className="bg-green-500 h-full"
                            style={{ width: `${(agent.done / agent.total) * 100}%` }}
                          />
                          <div
                            className="bg-amber-400 h-full"
                            style={{ width: `${(agent.inProgress / agent.total) * 100}%` }}
                          />
                          <div
                            className="bg-red-400 h-full"
                            style={{ width: `${(agent.blocked / agent.total) * 100}%` }}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>{agent.inProgress} active</span>
                      <span>{agent.blocked} blocked</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Active & blocked</h2>
              <p className="text-xs text-gray-500 mt-0.5">Work that still needs attention</p>
            </div>
            <Link to="/tasks" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          {loadingTasks ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : activeTasks.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No active or blocked tasks</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {dedupeActiveTasks(activeTasks).slice(0, 8).map((task) => {
                const summary = task.data?.summary ?? task.module ?? 'Untitled task';
                const log = task.data?.progress_log ?? [];
                const latest = log[log.length - 1];
                return (
                  <li key={task.id}>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{summary}</p>
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            {task.agent_name}
                            {task.project ? ` · ${task.project}` : ''}
                          </p>
                          {latest && (
                            <p className="text-xs text-gray-500 mt-1.5 truncate italic">
                              “{latest.note}”
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusStyles[task.status] ?? statusStyles.pending
                          }`}
                        >
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
            <p className="text-xs text-gray-500 mt-0.5">Latest agent events</p>
          </div>
          <Link to="/activity" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
            Full log
          </Link>
        </div>
        {loadingActivity ? (
          <div className="p-6 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No activity recorded yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activity.map((entry) => (
              <li key={entry.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 shrink-0">
                  {entry.action.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-xs text-gray-500 shrink-0">{entry.agent_name}</span>
                <span className="text-gray-700 truncate flex-1 min-w-0">
                  {(entry.data?.summary as string)
                    ?? (entry.data?.note as string)
                    ?? '—'}
                </span>
                {entry.task_id && (
                  <Link
                    to={`/tasks/${entry.task_id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-mono shrink-0"
                  >
                    #{entry.task_id.slice(0, 8)}
                  </Link>
                )}
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink to="/tasks" icon={ListTodo} label="View All Tasks" color="indigo" />
        <QuickLink to="/reports/weekly" icon={BarChart3} label="Weekly Report" color="green" />
        <QuickLink to="/activity" icon={Activity} label="Activity Log" color="amber" />
        <QuickLink to="/agents" icon={Bot} label="Manage Agents" color="purple" />
      </div>
    </div>
  );
}

function buildAgentProgress(tasks: TaskItem[], agents: AgentRow[]): AgentProgress[] {
  const byName = new Map<string, AgentProgress>();

  for (const agent of agents) {
    byName.set(agent.name, {
      name: agent.name,
      total: 0,
      done: 0,
      inProgress: 0,
      blocked: 0,
      pending: 0,
    });
  }

  for (const task of tasks) {
    const name = task.agent_name || 'unknown';
    let row = byName.get(name);
    if (!row) {
      row = { name, total: 0, done: 0, inProgress: 0, blocked: 0, pending: 0 };
      byName.set(name, row);
    }
    row.total += 1;
    if (task.status === 'done') row.done += 1;
    else if (task.status === 'in_progress') row.inProgress += 1;
    else if (task.status === 'blocked') row.blocked += 1;
    else row.pending += 1;
  }

  return [...byName.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** Seed data may contain duplicate summaries; keep one row per agent+summary for the active list. */
function dedupeActiveTasks(tasks: TaskItem[]): TaskItem[] {
  const seen = new Set<string>();
  const out: TaskItem[] = [];
  for (const task of tasks) {
    const key = `${task.agent_name}::${task.data?.summary ?? task.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(task);
  }
  return out;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function QuickLink({ to, icon: Icon, label, color }: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200',
    green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
  };

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-4 rounded-xl border ${colors[color] ?? colors.indigo} transition-colors`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}
