import { z } from "zod";

// Base schema with common fields
const SubjectBaseSchema = z.object({
  name: z.string().min(1).max(100),
  subjectTypeId: z.string(),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete subject schema (includes all fields from the database)
export const SubjectSchema = SubjectBaseSchema.extend({
  subjectId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new subject (no subjectId needed as it will be generated)
export const CreateSubjectSchema = SubjectBaseSchema.strict();

// Schema for updating an existing subject (requires subjectId)
export const UpdateSubjectSchema = SubjectBaseSchema.extend({
  subjectId: z.string(),
}).strict();

// Schema for retrieving a single subject by ID
export const SubjectIdSchema = z
  .object({
    subjectId: z.string(),
  })
  .strict();

// Schema for querying subjects with filtering, pagination, and sorting
export const SubjectQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    subjectTypeId: z.string().optional(),
    sort: z
      .enum(["name", "subjectTypeId", "createdAt", "updatedAt"])
      .optional()
      .default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Subject = z.infer<typeof SubjectSchema>;
export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>;
export type SubjectQuery = z.infer<typeof SubjectQuerySchema>;
