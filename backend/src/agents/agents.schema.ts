import { z } from 'zod';

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional().default({}),
});

export const UpdateAgentSchema = z.object({
  description: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional(),
});

export interface AgentRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  created_at: string;
}
