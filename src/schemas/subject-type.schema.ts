// src/schemas/subject-type.schema.ts
import { z } from "zod";

// Base schema for common fields
const subjectTypeBaseSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  description: z
    .string()
    .max(255, "説明は255文字以内で入力してください")
    .optional()
    .nullable(),
});

// For creating a new subject type
export const subjectTypeCreateSchema = subjectTypeBaseSchema;

// For updating an existing subject type
export const subjectTypeUpdateSchema = subjectTypeBaseSchema.partial().extend({
  subjectTypeId: z.string({ required_error: "更新には科目タイプIDが必要です" }),
});

// For filtering/querying subject types
export const subjectTypeFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  name: z.string().optional(),
});

// Form schema for UI components (subjectTypeId is optional for create/update forms)
export const subjectTypeFormSchema = subjectTypeBaseSchema.extend({
  subjectTypeId: z.string().optional(),
});

export type SubjectTypeCreate = z.infer<typeof subjectTypeCreateSchema>;
export type SubjectTypeUpdate = z.infer<typeof subjectTypeUpdateSchema>;
export type SubjectTypeFilter = z.infer<typeof subjectTypeFilterSchema>;
export type SubjectTypeFormValues = z.infer<typeof subjectTypeFormSchema>;
