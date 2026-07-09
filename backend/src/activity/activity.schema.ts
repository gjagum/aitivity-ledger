import { z } from 'zod';

export const ActivityAction = z.enum([
  'task_start',
  'task_end',
  'task_progress',
  'task_update_documents',
  'task_status_change',
  'task_assign',
  'session_start',
  'session_end',
]);

export type ActivityActionType = z.infer<typeof ActivityAction>;

export interface ActivityRow {
  id: string;
  task_id: string | null;
  agent_name: string | null;
  action: string;
  data: Record<string, unknown>;
  created_at: string;
}
