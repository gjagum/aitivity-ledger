import { z } from 'zod';

export const WeeklyReportQuery = z.object({
  timezone: z.string().default('UTC'),
});

export interface WeeklySummaryRow {
  project: string | null;
  agent: string;
  tasks_total: number;
  tasks_done: number;
  tasks_blocked: number;
  tasks_in_progress: number;
}

export interface AgentSummaryRow {
  agent_name: string;
  first_active: string | null;
  last_active: string | null;
  total_tasks: number;
  completed_tasks: number;
  avg_duration_seconds: number | null;
}
