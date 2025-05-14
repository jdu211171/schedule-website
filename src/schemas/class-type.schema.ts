import { z } from "zod";

// Base schema with common fields
const ClassTypeBaseSchema = z.object({
  name: z
    .string()
    .min(1, { message: "入力は必須です" })
    .max(100, { message: "100文字以内で入力してください" }),
  notes: z
    .string()
    .max(255, { message: "255文字以内で入力してください" })
    .nullable()
    .default(""),
});

// Complete class type schema (includes all fields from the database)
export const ClassTypeSchema = ClassTypeBaseSchema.extend({
  classTypeId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new class type (no classTypeId needed as it will be generated)
export const CreateClassTypeSchema = ClassTypeBaseSchema;

// Schema for updating an existing class type (requires classTypeId)
export const UpdateClassTypeSchema = ClassTypeBaseSchema.extend({
  classTypeId: z.string(),
});

// Schema for retrieving a single class type by ID
export const ClassTypeIdSchema = z
  .object({
    classTypeId: z.string({ required_error: "IDは必須です" }),
  })
  .strict();

// Schema for querying class types with filtering, pagination, and sorting
export const ClassTypeQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100, { message: "100以下の値を入力してください" })
      .optional()
      .default(10),
    name: z.string().optional(),
    sort: z
      .enum(["name", "createdAt", "updatedAt"])
      .optional()
      .default("createdAt"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type ClassType = z.infer<typeof ClassTypeSchema>;
export type CreateClassTypeInput = z.infer<typeof CreateClassTypeSchema>;
export type UpdateClassTypeInput = z.infer<typeof UpdateClassTypeSchema>;
export type ClassTypeQuery = z.infer<typeof ClassTypeQuerySchema>;
