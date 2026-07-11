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
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, type Developer, type DevSession } from '../../api.ts';

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

interface UserProgress {
  developer_id: string;
  name: string;
  // Email isn't stored in the data model; the subtitle shows the GitHub handle.
  subtitle: string;
  total: number;
  closed: number;
  open: number;
  superseded: number;
  cancelled: number;
}

const statusStyles: Record<string, string> = {
  done: 'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-700',
  abandoned: 'bg-gray-100 text-gray-500',
};

// DevSession.status: open | closed | superseded | cancelled
const outcomeStyles: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  closed: 'bg-green-100 text-green-700',
  superseded: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [sessions, setSessions] = useState<DevSession[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingDevelopers, setLoadingDevelopers] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
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

    api.developers
      .list()
      .then((rows) => {
        if (!cancelled) setDevelopers(rows);
      })
      .catch(() => {
        /* users section can stay empty */
      })
      .finally(() => {
        if (!cancelled) setLoadingDevelopers(false);
      });

    // Pull a generous window of AI work sessions so the per-user rollup
    // reflects everyone's progression, not just the most recent page.
    api.sessions
      .list({ limit: 200 })
      .then((res) => {
        if (!cancelled) setSessions(res.items);
      })
      .catch(() => {
        /* sessions section can stay empty */
      })
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
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

  const userProgress = buildUserProgress(sessions, developers);
  // Open sessions — each developer's current AI work — most stale first so the
  // longest-running in-flight work surfaces to the top.
  const inFlight = sessions
    .filter((s) => s.status === 'open')
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  // developer_id → @handle, for the in-flight subtitle.
  const developerHandles = new Map(
    developers.map((d) => [d.id, d.github_user ? `@${d.github_user}` : null]),
  );
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
      label: 'Users',
      value: developers.length,
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
      loading: loadingDevelopers,
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
            <h2 className="text-sm font-semibold text-gray-900">Progress by user</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              AI work sessions per developer, by outcome
            </p>
          </div>
          {loadingSessions || loadingDevelopers ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : userProgress.length === 0 || userProgress.every((u) => u.total === 0) ? (
            <p className="p-6 text-sm text-gray-500">No sessions recorded yet</p>
          ) : (
            <div className="p-6 space-y-3.5">
              {userProgress
                .filter((u) => u.total > 0)
                .map((user) => {
                  const total = user.total;
                  return (
                    <div key={user.developer_id} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-4 sm:col-span-3 min-w-0">
                        <Link to="/sessions" className="block hover:underline">
                          <span className="block text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </span>
                        </Link>
                        <span className="block text-xs text-gray-500 truncate">
                          {user.subtitle}
                        </span>
                      </div>
                      <div className="col-span-6 sm:col-span-7">
                        <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                          {total > 0 &&
                            (
                              [
                                ['closed', user.closed, 'bg-green-500'],
                                ['open', user.open, 'bg-amber-400'],
                                ['superseded', user.superseded, 'bg-indigo-400'],
                                ['cancelled', user.cancelled, 'bg-gray-400'],
                              ] as const
                            ).map(
                              ([key, value, color]) =>
                                value > 0 && (
                                  <div
                                    key={key}
                                    className={`${color} h-full transition-all`}
                                    style={{ width: `${(value / total) * 100}%` }}
                                    title={`${key}: ${value}`}
                                  />
                                ),
                            )}
                        </div>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs text-gray-500">
                          <span className="font-semibold text-gray-900">{total}</span> session
                          {total === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3 mt-1 border-t border-gray-100 text-xs text-gray-500">
                <LegendDot color="bg-green-500" label="Closed" />
                <LegendDot color="bg-amber-400" label="Open" />
                <LegendDot color="bg-indigo-400" label="Superseded" />
                <LegendDot color="bg-gray-400" label="Cancelled" />
              </div>
            </div>
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
            <h2 className="text-sm font-semibold text-gray-900">Currently in flight</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Open AI work sessions per developer
            </p>
          </div>
          <Link to="/sessions?status=open" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
            View all
          </Link>
        </div>
        {loadingSessions ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : inFlight.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No open sessions — nothing in flight.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Developer</th>
                  <th className="px-6 py-3 font-medium">Module</th>
                  <th className="px-6 py-3 font-medium">Started</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Open for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inFlight.map((s) => {
                  const handle = developerHandles.get(s.developer_id);
                  const age = openFor(s.started_at);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link
                          to={`/sessions/${s.id}`}
                          className="block group"
                        >
                          <span className="block text-sm font-medium text-gray-900 group-hover:underline">
                            {s.developer_name}
                          </span>
                          {handle && (
                            <span className="block text-xs text-gray-500 font-mono">
                              {handle}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700 max-w-xs truncate">{s.module}</td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(s.started_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${age.style}`}
                          title={`Started ${new Date(s.started_at).toLocaleString()}`}
                        >
                          {age.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Session log</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Recent AI work sessions, most recent first
            </p>
          </div>
          <Link
            to="/sessions"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            View all
          </Link>
        </div>
        {loadingSessions ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No sessions recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium w-16">#</th>
                  <th className="px-6 py-3 font-medium">Developer</th>
                  <th className="px-6 py-3 font-medium">Module</th>
                  <th className="px-6 py-3 font-medium">Outcome</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        to={`/sessions/${s.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        #{s.number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-900 whitespace-nowrap">
                      {s.developer_name}
                    </td>
                    <td className="px-6 py-3 text-gray-700 max-w-xs truncate">
                      {s.module}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          outcomeStyles[s.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(s.started_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

/**
 * Turn a session start time into an "Open for X" label + urgency color.
 * Green = fresh (today), amber = a few days, red = stale (over a week) —
 * so the team can spot in-flight work that's been dragging.
 */
function openFor(startedAt: string): { label: string; style: string } {
  const ms = Date.now() - new Date(startedAt).getTime();
  const days = ms / 86_400_000;
  const label =
    days < 1 ? 'Open < 1d' : days < 14 ? `Open ${Math.floor(days)}d` : `Open ${Math.floor(days / 7)}w`;
  const style =
    days < 1
      ? 'bg-green-100 text-green-700'
      : days < 7
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  return { label, style };
}

/**
 * Roll up each developer's AI work sessions so the team can see who is driving
 * the AI and how their sessions break down by outcome.
 *
 * Sessions are the right unit here: each DevSession belongs to a human developer
 * and represents one stint of AI-assisted work (a module, a branch, a plan,
 * credits burned, ready-to-merge state). Tasks are AI-agent work products and
 * don't carry a developer link, so we don't fold them in.
 */
function buildUserProgress(sessions: DevSession[], developers: Developer[]): UserProgress[] {
  const byDeveloper = new Map<string, UserProgress>();
  for (const dev of developers) {
    byDeveloper.set(dev.id, {
      developer_id: dev.id,
      name: dev.name,
      // Email isn't part of the data model; show the GitHub handle instead.
      subtitle: dev.github_user ? `@${dev.github_user}` : '—',
      total: 0,
      closed: 0,
      open: 0,
      superseded: 0,
      cancelled: 0,
    });
  }

  const empty = (id: string, name: string): UserProgress => ({
    developer_id: id,
    name,
    subtitle: '—',
    total: 0,
    closed: 0,
    open: 0,
    superseded: 0,
    cancelled: 0,
  });

  for (const session of sessions) {
    let row = byDeveloper.get(session.developer_id);
    if (!row) {
      // Session references a developer not in the roster (e.g. deleted). Synthesize
      // a row from the session's denormalized developer_name so they aren't hidden.
      row = empty(session.developer_id, session.developer_name);
      byDeveloper.set(session.developer_id, row);
    }
    row.total += 1;
    if (session.status === 'closed') row.closed += 1;
    else if (session.status === 'open') row.open += 1;
    else if (session.status === 'superseded') row.superseded += 1;
    else if (session.status === 'cancelled') row.cancelled += 1;
  }

  // Most active developers first, then alphabetically.
  return [...byDeveloper.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );
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
