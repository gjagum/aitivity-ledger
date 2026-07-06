import { z } from 'zod';

export const ProgressEntrySchema = z.object({
  at: z.string().datetime(),
  note: z.string().min(1).max(1000),
  by: z.string().max(100).optional(),
});

export const TokenUsageSchema = z.object({
  input: z.number().int().nonnegative().optional(),
  output: z.number().int().nonnegative().optional(),
}).optional();

export const TaskDataSchema = z.object({
  summary: z.string().min(1).max(500),
  module: z.string().max(200).optional(),
  status: z.enum(['pending', 'in_progress', 'done', 'blocked', 'abandoned']).default('pending'),
  agent: z.string().min(1).max(100),
  project: z.string().max(100).optional(),
  branch: z.string().max(200).optional(),
  commit: z.string().max(40).optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional().nullable(),
  progress_log: z.array(ProgressEntrySchema).optional().default([]),
  files_changed: z.array(z.string()).optional().default([]),
  ai_provider: z.string().max(100).optional(),
  token_usage: TokenUsageSchema,
}).passthrough();

export type TaskData = z.infer<typeof TaskDataSchema>;

export const CreateTaskSchema = z.object({
  external_id: z.string().optional(),
  data: TaskDataSchema,
});

export const UpdateTaskSchema = z.object({
  data: TaskDataSchema.partial(),
});

export const AddProgressSchema = z.object({
  note: z.string().min(1).max(1000),
  agent: z.string().max(100).optional(),
});
