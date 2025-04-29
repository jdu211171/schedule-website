import { z } from "zod";

// Base schema with common fields
const TeacherSubjectBaseSchema = z.object({
  teacherId: z.string(),
  subjectId: z.string(),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete teacher subject schema (includes all fields from the database)
export const TeacherSubjectSchema = TeacherSubjectBaseSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new teacher subject
export const CreateTeacherSubjectSchema = TeacherSubjectBaseSchema.strict();

// Schema for updating an existing teacher subject
export const UpdateTeacherSubjectSchema = TeacherSubjectBaseSchema.strict();

// Schema for retrieving a single teacher subject by composite ID
export const TeacherSubjectIdSchema = z
  .object({
    teacherId: z.string(),
    subjectId: z.string(),
  })
  .strict();

// Schema for querying teacher subjects with filtering, pagination, and sorting
export const TeacherSubjectQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    teacherId: z.string().optional(),
    subjectId: z.string().optional(),
    sort: z
      .enum(["teacherId", "subjectId", "createdAt", "updatedAt"])
      .optional()
      .default("createdAt"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type TeacherSubject = z.infer<typeof TeacherSubjectSchema>;
export type CreateTeacherSubjectInput = z.infer<
  typeof CreateTeacherSubjectSchema
>;
export type UpdateTeacherSubjectInput = z.infer<
  typeof UpdateTeacherSubjectSchema
>;
export type TeacherSubjectQuery = z.infer<typeof TeacherSubjectQuerySchema>;
