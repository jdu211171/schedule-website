import { Prisma } from "@prisma/client";
import { z } from "zod";

// Base schema with common fields
const SubjectTypeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete subject type schema (includes all fields from the database)
export const SubjectTypeSchema = SubjectTypeBaseSchema.extend({
  subjectTypeId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new subject type (no subjectTypeId needed as it will be generated)
export const CreateSubjectTypeSchema = SubjectTypeBaseSchema.strict();

// Schema for updating an existing subject type (requires subjectTypeId)
export const UpdateSubjectTypeSchema = SubjectTypeBaseSchema.extend({
  subjectTypeId: z.string(),
}).strict();

// Schema for retrieving a single subject type by ID
export const SubjectTypeIdSchema = z
  .object({
    subjectTypeId: z.string(),
  })
  .strict();

// Schema for querying subject types with filtering, pagination, and sorting
export const SubjectTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    sort: z.enum(["name", "createdAt", "updatedAt"]).optional().default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type SubjectType = z.infer<typeof SubjectTypeSchema>;
export type CreateSubjectTypeInput = z.infer<typeof CreateSubjectTypeSchema>;
export type UpdateSubjectTypeInput = z.infer<typeof UpdateSubjectTypeSchema>;
export type SubjectTypeQuery = z.infer<typeof SubjectTypeQuerySchema>;
export type SubjectTypeWithRelations = Prisma.SubjectTypeGetPayload<{
  include: {
    subjects: true;
    subjectToSubjectTypes: true;
    classSessions: true;
    regularClassTemplates: true;
    teacherSubjects: true;
  };
}>;
