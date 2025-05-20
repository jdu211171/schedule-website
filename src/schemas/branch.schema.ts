// src/schemas/branch.schema.ts
import { z } from "zod";

// Filters for querying branches
export const branchFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  name: z.string().optional(),
});

// For creating a new branch
export const branchCreateSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().max(255).optional().nullable(),
});

// For updating an existing branch
export const branchUpdateSchema = z.object({
  branchId: z.string(),
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
  userIds: z.array(z.string()).optional(),
});

export type BranchCreate = z.infer<typeof branchCreateSchema>;
export type BranchUpdate = z.infer<typeof branchUpdateSchema>;
