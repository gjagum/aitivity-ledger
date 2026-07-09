import { z } from 'zod';

export const CreateDeveloperSchema = z.object({
  name: z.string().min(1),
  github_user: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const UpdateDeveloperSchema = z.object({
  name: z.string().min(1).optional(),
  github_user: z.string().min(1).nullable().optional(),
  active: z.boolean().optional(),
});

export type DeveloperRow = {
  id: string;
  name: string;
  github_user: string | null;
  active: boolean;
  created_at: string;
};
