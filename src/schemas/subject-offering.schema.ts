// src/schemas/subject-offering.schema.ts
import { z } from "zod";

// Base schema for common fields
const subjectOfferingBaseSchema = z.object({
  subjectId: z.string().min(1, "科目を選択してください"),
  subjectTypeId: z.string().min(1, "科目タイプを選択してください"),
  offeringCode: z
    .string()
    .max(50, "提供コードは50文字以内で入力してください")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
});

// For creating a new subject offering
export const subjectOfferingCreateSchema = subjectOfferingBaseSchema;

// For updating an existing subject offering
export const subjectOfferingUpdateSchema = subjectOfferingBaseSchema
  .partial()
  .extend({
    subjectOfferingId: z.string({
      required_error: "更新には科目提供IDが必要です",
    }),
  });

// For filtering/querying subject offerings
export const subjectOfferingFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  subjectId: z.string().optional(),
  subjectTypeId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  branchId: z.string().optional(), // For filtering by branch through subject
  search: z.string().optional(), // For searching by subject name or type name
});

// Form schema for UI components
export const subjectOfferingFormSchema = subjectOfferingBaseSchema.extend({
  subjectOfferingId: z.string().optional(),
});

// Schema for bulk operations (creating multiple offerings at once)
export const subjectOfferingBulkCreateSchema = z.object({
  subjectId: z.string().min(1, "科目を選択してください"),
  subjectTypeIds: z
    .array(z.string())
    .min(1, "少なくとも1つの科目タイプを選択してください"),
  offeringCodePrefix: z
    .string()
    .max(20, "提供コードプレフィックスは20文字以内で入力してください")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
});

export type SubjectOfferingCreate = z.infer<typeof subjectOfferingCreateSchema>;
export type SubjectOfferingUpdate = z.infer<typeof subjectOfferingUpdateSchema>;
export type SubjectOfferingFilter = z.infer<typeof subjectOfferingFilterSchema>;
export type SubjectOfferingFormValues = z.infer<
  typeof subjectOfferingFormSchema
>;
export type SubjectOfferingBulkCreate = z.infer<
  typeof subjectOfferingBulkCreateSchema
>;
