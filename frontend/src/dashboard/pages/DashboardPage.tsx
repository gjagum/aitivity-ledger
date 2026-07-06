import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListTodo, BarChart3, Activity, Bot, AlertCircle } from 'lucide-react';
import { api } from '../../api.ts';

interface Stats {
  totalTasks: number;
  tasksDone: number;
  tasksBlocked: number;
  tasksInProgress: number;
  agents: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.tasks.list({ limit: 1 }),
      api.reports.weekly(),
      api.agents.list(),
      api.tasks.list({ status: 'blocked', limit: 0 }),
    ])
      .then(([tasks, _weekly, agents]) => {
        setStats({
          totalTasks: tasks.count,
          tasksDone: 0, // will compute from weekly
          tasksBlocked: 0,
          tasksInProgress: 0,
          agents: (agents as unknown[]).length,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch weekly stats for done/blocked/in_progress counts
  useEffect(() => {
    api.reports.weekly().then((rows) => {
      const data = rows as Array<{
        tasks_total: number;
        tasks_done: number;
        tasks_blocked: number;
        tasks_in_progress: number;
      }>;
      setStats((prev) => prev ? {
        ...prev,
        tasksDone: data.reduce((s, r) => s + Number(r.tasks_done), 0),
        tasksBlocked: data.reduce((s, r) => s + Number(r.tasks_blocked), 0),
        tasksInProgress: data.reduce((s, r) => s + Number(r.tasks_in_progress), 0),
      } : prev);
    }).catch(() => {});
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Tasks',
      value: stats?.totalTasks ?? 0,
      icon: ListTodo,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Completed (This Week)',
      value: stats?.tasksDone ?? 0,
      icon: BarChart3,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'In Progress',
      value: stats?.tasksInProgress ?? 0,
      icon: Activity,
      color: 'text-amber-600 bg-amber-100',
    },
    {
      label: 'Blocked',
      value: stats?.tasksBlocked ?? 0,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100',
    },
    {
      label: 'Agents',
      value: stats?.agents ?? 0,
      icon: Bot,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of AI agent activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '-' : card.value}
                </p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink to="/tasks" icon={ListTodo} label="View All Tasks" color="indigo" />
        <QuickLink to="/reports/weekly" icon={BarChart3} label="Weekly Report" color="green" />
        <QuickLink to="/activity" icon={Activity} label="Activity Log" color="amber" />
        <QuickLink to="/agents" icon={Bot} label="Manage Agents" color="purple" />
      </div>
    </div>
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
