import { useEffect, useState } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import { api } from '../../api.ts';
import { StatCard } from '../components/StatCard.tsx';

interface WeeklyRow {
  project: string | null;
  agent: string;
  tasks_total: number;
  tasks_done: number;
  tasks_blocked: number;
  tasks_in_progress: number;
}

export function WeeklyReportPage() {
  const [data, setData] = useState<WeeklyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    setLoading(true);
    api.reports.weekly(timezone)
      .then((rows) => setData(rows as WeeklyRow[]))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [timezone]);

  const totals = data.reduce(
    (acc, row) => ({
      total: acc.total + Number(row.tasks_total),
      done: acc.done + Number(row.tasks_done),
      blocked: acc.blocked + Number(row.tasks_blocked),
      inProgress: acc.inProgress + Number(row.tasks_in_progress),
    }),
    { total: 0, done: 0, blocked: 0, inProgress: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Report</h1>
          <p className="text-gray-500 mt-1">Current week summary grouped by agent and project</p>
        </div>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Europe/Berlin">Europe/Berlin</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
          <option value="Asia/Shanghai">Asia/Shanghai</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={totals.total} color="blue" />
        <StatCard label="Completed" value={totals.done} color="green" />
        <StatCard label="In Progress" value={totals.inProgress} color="amber" />
        <StatCard label="Blocked" value={totals.blocked} color="red" />
      </div>

      {/* Table */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No tasks this week</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Agent</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Done</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">In Progress</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Blocked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.project ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{row.agent}</td>
                  <td className="px-4 py-3 text-center">{row.tasks_total}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{row.tasks_done}</td>
                  <td className="px-4 py-3 text-center text-amber-600 font-medium">{row.tasks_in_progress}</td>
                  <td className="px-4 py-3 text-center text-red-600 font-medium">{row.tasks_blocked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
