import { z } from "zod";

// Base schema with common fields
const ClassTypeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z
    .string()
    .max(255)
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete class type schema (includes all fields from the database)
export const ClassTypeSchema = ClassTypeBaseSchema.extend({
  classTypeId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new class type (no classTypeId needed as it will be generated)
export const CreateClassTypeSchema = ClassTypeBaseSchema.strict();

// Schema for updating an existing class type (requires classTypeId)
export const UpdateClassTypeSchema = ClassTypeBaseSchema.extend({
  classTypeId: z.string(),
}).strict();

// Schema for retrieving a single class type by ID
export const ClassTypeIdSchema = z
  .object({
    classTypeId: z.string(),
  })
  .strict();

// Schema for querying class types with filtering, pagination, and sorting
export const ClassTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    name: z.string().optional(),
    sort: z.enum(["name", "createdAt", "updatedAt"]).optional().default("name"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type ClassType = z.infer<typeof ClassTypeSchema>;
export type CreateClassTypeInput = z.infer<typeof CreateClassTypeSchema>;
export type UpdateClassTypeInput = z.infer<typeof UpdateClassTypeSchema>;
export type ClassTypeQuery = z.infer<typeof ClassTypeQuerySchema>;
