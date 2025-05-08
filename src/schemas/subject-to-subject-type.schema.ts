import { z } from "zod";

// Base schema with common fields
const SubjectToSubjectTypeBaseSchema = z.object({
  subjectId: z.string(),
  subjectTypeId: z.string(),
});

// Complete subject to subject type schema (includes all fields from the database)
export const SubjectToSubjectTypeSchema = SubjectToSubjectTypeBaseSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new subject to subject type mapping
export const CreateSubjectToSubjectTypeSchema = SubjectToSubjectTypeBaseSchema.strict();

// Schema for updating an existing subject to subject type mapping
export const UpdateSubjectToSubjectTypeSchema = SubjectToSubjectTypeBaseSchema.strict();

// Schema for retrieving a single subject to subject type mapping by composite ID
export const SubjectToSubjectTypeIdSchema = z
  .object({
    subjectId: z.string(),
    subjectTypeId: z.string(),
  })
  .strict();

// Schema for querying subject to subject type mappings with filtering, pagination, and sorting
export const SubjectToSubjectTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    subjectId: z.string().optional(),
    subjectTypeId: z.string().optional(),
    sort: z
      .enum(["subjectId", "subjectTypeId", "createdAt", "updatedAt"])
      .optional()
      .default("createdAt"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type SubjectToSubjectType = z.infer<typeof SubjectToSubjectTypeSchema>;
export type CreateSubjectToSubjectTypeInput = z.infer<
  typeof CreateSubjectToSubjectTypeSchema
>;
export type UpdateSubjectToSubjectTypeInput = z.infer<
  typeof UpdateSubjectToSubjectTypeSchema
>;
export type SubjectToSubjectTypeQuery = z.infer<typeof SubjectToSubjectTypeQuerySchema>;
