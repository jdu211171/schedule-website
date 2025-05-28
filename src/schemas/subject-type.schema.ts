// src/schemas/subject-type.schema.ts
import { z } from "zod";

// Filters for querying subject types
export const subjectTypeFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  name: z.string().optional(),
});

// For creating a new subject type
export const subjectTypeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().max(255).optional().nullable(),
});

// For updating an existing subject type
export const subjectTypeUpdateSchema = z.object({
  subjectTypeId: z.string(),
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
});

export type SubjectTypeCreate = z.infer<typeof subjectTypeCreateSchema>;
export type SubjectTypeUpdate = z.infer<typeof subjectTypeUpdateSchema>;
export type SubjectTypeFilter = z.infer<typeof subjectTypeFilterSchema>;
