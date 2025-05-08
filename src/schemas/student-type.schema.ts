import { z } from "zod";

// Base schema with common fields
const StudentTypeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  maxYears: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional(), // Add maxYears as optional
});

// Complete student type schema (includes all fields from the database)
export const StudentTypeSchema = StudentTypeBaseSchema.extend({
  studentTypeId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new student type (no studentTypeId needed as it will be generated)
export const CreateStudentTypeSchema = StudentTypeBaseSchema.strict();

// Schema for updating an existing student type (requires studentTypeId)
export const UpdateStudentTypeSchema = StudentTypeBaseSchema.extend({
  studentTypeId: z.string(),
}).strict();

// Schema for retrieving a single student type by ID
export const StudentTypeIdSchema = z
  .object({
    studentTypeId: z.string(),
  })
  .strict();

// Schema for querying student types with filtering, pagination, and sorting
export const StudentTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    sort: z.enum(["name", "createdAt", "updatedAt"]).optional().default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type StudentType = z.infer<typeof StudentTypeSchema>;
export type CreateStudentTypeInput = z.infer<typeof CreateStudentTypeSchema>;
export type UpdateStudentTypeInput = z.infer<typeof UpdateStudentTypeSchema>;
export type StudentTypeQuery = z.infer<typeof StudentTypeQuerySchema>;
