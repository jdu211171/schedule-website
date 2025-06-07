// src/schemas/subject-type.schema.ts
import { z } from "zod";

// Valid sort fields
export const SUBJECT_TYPE_SORT_FIELDS = [
  "order",
  "name",
  "createdAt",
  "updatedAt",
] as const;
export type SubjectTypeSortField = (typeof SUBJECT_TYPE_SORT_FIELDS)[number];

// Filters for querying subject types
export const subjectTypeFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  name: z.string().optional(),
  sortBy: z.enum(SUBJECT_TYPE_SORT_FIELDS).default("order"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// For creating a new subject type
export const subjectTypeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().max(255).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

// For updating an existing subject type
export const subjectTypeUpdateSchema = z.object({
  subjectTypeId: z.string(),
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

// For updating subject type order
export const subjectTypeOrderUpdateSchema = z.object({
  subjectTypeIds: z.array(z.string()).min(1),
});

export type SubjectTypeCreate = z.infer<typeof subjectTypeCreateSchema>;
export type SubjectTypeUpdate = z.infer<typeof subjectTypeUpdateSchema>;
export type SubjectTypeOrderUpdate = z.infer<
  typeof subjectTypeOrderUpdateSchema
>;
export type SubjectTypeFilter = z.infer<typeof subjectTypeFilterSchema>;
