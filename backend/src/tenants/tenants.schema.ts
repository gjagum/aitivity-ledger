import { z } from 'zod';

export const CreateTenantSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  config: z.record(z.unknown()).optional().default({}),
});

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  api_key: string;
  config: Record<string, unknown>;
  created_at: string;
}
