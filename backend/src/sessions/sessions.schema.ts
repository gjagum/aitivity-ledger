import { z } from 'zod';

export const SessionStatus = z.enum(['open', 'closed', 'superseded', 'cancelled']);
export const ReqStatus = z.enum(['pending', 'complete', 'deferred', 'cancelled']);
export const FileCategory = z.enum(['OWNED', 'SHARED', 'CORE', 'READ_ONLY']);
export const ChangeType = z.enum(['added', 'modified', 'deleted']);

export const OpenSessionSchema = z.object({
  developer_name: z.string().min(1),
  github_user: z.string().min(1).optional(),
  module: z.string().min(1),
  branch: z.string().min(1),
  plan: z.array(z.string()).optional(),
  started_at: z.string().datetime().optional(),
});

export const UpdateSessionSchema = z.object({
  module: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  plan: z.array(z.string()).optional(),
  status: SessionStatus.optional(),
  credits_used: z.number().nonnegative().nullable().optional(),
  ready_to_merge: z.boolean().optional(),
  merge_reason: z.string().nullable().optional(),
  handover_notes: z.string().nullable().optional(),
  blockers: z.string().nullable().optional(),
});

export const CloseSessionSchema = z.object({
  credits_used: z.number().nonnegative().optional(),
  ready_to_merge: z.boolean().optional(),
  merge_reason: z.string().optional(),
  handover_notes: z.string().optional(),
  blockers: z.string().optional(),
  status: z.enum(['closed', 'superseded', 'cancelled']).optional(),
});

export const UpsertRequirementSchema = z.object({
  req_id: z.string().min(1),
  description: z.string().min(1),
  status: ReqStatus.optional(),
  proof: z
    .object({
      file: z.string().optional(),
      function: z.string().optional(),
      trace: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const AddSessionFileSchema = z.object({
  path: z.string().min(1),
  change_type: ChangeType,
  category: FileCategory,
});

export type SessionRow = {
  id: string;
  number: number;
  developer_id: string;
  developer_name: string;
  module: string;
  branch: string;
  status: string;
  plan: string[];
  started_at: string;
  ended_at: string | null;
  credits_used: number | null;
  ready_to_merge: boolean;
  merge_reason: string | null;
  handover_notes: string | null;
  blockers: string | null;
  created_at: string;
  updated_at: string;
  requirements?: RequirementRow[];
  files?: SessionFileRow[];
};

export type RequirementRow = {
  id: string;
  req_id: string;
  description: string;
  status: string;
  proof: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SessionFileRow = {
  id: string;
  path: string;
  change_type: string;
  category: string;
  created_at: string;
};
