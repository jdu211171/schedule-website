import { z } from "zod";

// Base schema with common fields
const GradeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  studentTypeId: z.string(),
  gradeYear: z.number().int(),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete grade schema (includes all fields from the database)
export const GradeSchema = GradeBaseSchema.extend({
  gradeId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new grade (no gradeId needed as it will be generated)
export const CreateGradeSchema = GradeBaseSchema.strict();

// Schema for updating an existing grade (requires gradeId)
export const UpdateGradeSchema = GradeBaseSchema.extend({
  gradeId: z.string(),
}).strict();

// Schema for retrieving a single grade by ID
export const GradeIdSchema = z
  .object({
    gradeId: z.string(),
  })
  .strict();

// Schema for querying grades with filtering, pagination, and sorting
export const GradeQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    studentTypeId: z.string().optional(),
    gradeYear: z.coerce.number().int().optional(),
    sort: z
      .enum(["name", "studentTypeId", "gradeYear", "createdAt", "updatedAt"])
      .optional()
      .default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Grade = z.infer<typeof GradeSchema>;
export type CreateGradeInput = z.infer<typeof CreateGradeSchema>;
export type UpdateGradeInput = z.infer<typeof UpdateGradeSchema>;
export type GradeQuery = z.infer<typeof GradeQuerySchema>;
