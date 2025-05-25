// src/schemas/teacher-qualification.schema.ts
import { z } from "zod";

// Base schema for common fields
const teacherQualificationBaseSchema = z.object({
  teacherId: z.string().min(1, "教師を選択してください"),
  subjectOfferingId: z.string().min(1, "科目提供を選択してください"),
  verified: z.boolean().default(true), // Default true since staff/admin create these
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
});

// For creating a new teacher qualification
export const teacherQualificationCreateSchema = teacherQualificationBaseSchema;

// For updating an existing teacher qualification
export const teacherQualificationUpdateSchema = teacherQualificationBaseSchema
  .partial()
  .extend({
    qualificationId: z.string({ required_error: "更新には資格IDが必要です" }),
  });

// For filtering/querying teacher qualifications
export const teacherQualificationFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  teacherId: z.string().optional(),
  subjectOfferingId: z.string().optional(),
  subjectId: z.string().optional(), // Filter by subject (through offering)
  subjectTypeId: z.string().optional(), // Filter by subject type (through offering)
  verified: z.coerce.boolean().optional(),
  branchId: z.string().optional(), // Filter by branch (through subject)
});

// Form schema for UI components
export const teacherQualificationFormSchema =
  teacherQualificationBaseSchema.extend({
    qualificationId: z.string().optional(),
  });

// Schema for bulk operations (adding multiple qualifications for a teacher)
export const teacherQualificationBulkCreateSchema = z.object({
  teacherId: z.string().min(1, "教師を選択してください"),
  subjectOfferingIds: z
    .array(z.string())
    .min(1, "少なくとも1つの科目提供を選択してください"),
  verified: z.boolean().default(true),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
});

// Schema for batch verification (toggle verification status)
export const teacherQualificationBatchVerifySchema = z.object({
  qualificationIds: z
    .array(z.string())
    .min(1, "少なくとも1つの資格を選択してください"),
  verified: z.boolean(),
});

export type TeacherQualificationCreate = z.infer<
  typeof teacherQualificationCreateSchema
>;
export type TeacherQualificationUpdate = z.infer<
  typeof teacherQualificationUpdateSchema
>;
export type TeacherQualificationFilter = z.infer<
  typeof teacherQualificationFilterSchema
>;
export type TeacherQualificationFormValues = z.infer<
  typeof teacherQualificationFormSchema
>;
export type TeacherQualificationBulkCreate = z.infer<
  typeof teacherQualificationBulkCreateSchema
>;
export type TeacherQualificationBatchVerify = z.infer<
  typeof teacherQualificationBatchVerifySchema
>;
