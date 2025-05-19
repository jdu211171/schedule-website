// src/schemas/subject.schema.ts
import { z } from "zod";

// Filters for querying subjects
export const subjectFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  name: z.string().optional(),
  branchId: z.string().optional(),
});

// For creating a new subject
export const subjectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  branchId: z.string().optional(),
  notes: z.string().max(255).optional().nullable(),
});

// For updating an existing subject
export const subjectUpdateSchema = z.object({
  subjectId: z.string(),
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(255).optional().nullable(),
});

export type SubjectCreate = z.infer<typeof subjectCreateSchema>;
export type SubjectUpdate = z.infer<typeof subjectUpdateSchema>;
