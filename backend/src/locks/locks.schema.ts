import { z } from 'zod';
import { FileCategory } from '../sessions/sessions.schema.ts';

export const ClaimLockSchema = z.object({
  path: z.string().min(1),
  category: FileCategory.default('OWNED'),
  developer_name: z.string().min(1),
  session_id: z.string().uuid().optional(),
  branch: z.string().min(1),
  notes: z.string().optional(),
});

export const CheckLocksSchema = z.object({
  paths: z.array(z.string().min(1)).min(1),
});

export type LockRow = {
  id: string;
  path: string;
  category: string;
  developer_id: string;
  developer_name: string;
  session_id: string | null;
  session_number: number | null;
  branch: string;
  notes: string | null;
  locked_at: string;
  released_at: string | null;
};

export type LockConflict = {
  path: string;
  locked: boolean;
  lock?: LockRow;
};
