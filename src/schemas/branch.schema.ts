// src/schemas/branch.schema.ts
import { z } from "zod";

// Valid sort fields
export const BRANCH_SORT_FIELDS = [
  "order",
  "name",
  "createdAt",
  "updatedAt",
] as const;
export type BranchSortField = (typeof BRANCH_SORT_FIELDS)[number];

// Filters for querying branches
export const branchFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  name: z.string().optional(),
  sortBy: z.enum(BRANCH_SORT_FIELDS).default("order"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// For creating a new branch
export const branchCreateSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().max(255).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

// For updating an existing branch
export const branchUpdateSchema = z.object({
  branchId: z.string(),
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  userIds: z.array(z.string()).optional(),
});

// For updating branch order
export const branchOrderUpdateSchema = z.object({
  branchIds: z.array(z.string()).min(1),
});

export type BranchCreate = z.infer<typeof branchCreateSchema>;
export type BranchUpdate = z.infer<typeof branchUpdateSchema>;
export type BranchOrderUpdate = z.infer<typeof branchOrderUpdateSchema>;
