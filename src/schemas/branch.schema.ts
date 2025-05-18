// src/schemas/branch.schema.ts
import { z } from "zod";

export const branchCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  notes: z.string().max(255).optional().nullable(),
  userIds: z.array(z.string()).optional(),
});

export const branchUpdateSchema = z.object({
  branchId: z.string(),
  name: z.string().min(1, "Name is required").max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
  userIds: z.array(z.string()).optional(),
});

export const branchFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
});

export type BranchCreate = z.infer<typeof branchCreateSchema>;
export type BranchUpdate = z.infer<typeof branchUpdateSchema>;
export type BranchFilter = z.infer<typeof branchFilterSchema>;
