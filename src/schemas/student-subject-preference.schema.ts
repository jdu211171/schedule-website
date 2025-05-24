// src/schemas/student-subject-preference.schema.ts
import { z } from "zod";

// Base schema for common fields
const studentSubjectPreferenceBaseSchema = z.object({
  studentId: z.string().min(1, "学生を選択してください"),
  subjectOfferingId: z.string().min(1, "科目提供を選択してください"),
  priority: z
    .number()
    .int()
    .min(1, "優先度は1以上の数値で入力してください")
    .max(10, "優先度は10以下で入力してください")
    .default(1),
  notes: z
    .string()
    .max(255, "備考は255文字以内で入力してください")
    .optional()
    .nullable(),
});

// For creating a new student subject preference
export const studentSubjectPreferenceCreateSchema =
  studentSubjectPreferenceBaseSchema;

// For updating an existing student subject preference
export const studentSubjectPreferenceUpdateSchema =
  studentSubjectPreferenceBaseSchema.partial().extend({
    preferenceId: z.string({ required_error: "更新には希望IDが必要です" }),
  });

// For filtering/querying student subject preferences
export const studentSubjectPreferenceFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  studentId: z.string().optional(),
  subjectOfferingId: z.string().optional(),
  subjectId: z.string().optional(), // Filter by subject (through offering)
  subjectTypeId: z.string().optional(), // Filter by subject type (through offering)
  priority: z.coerce.number().int().optional(),
  branchId: z.string().optional(), // Filter by branch (through subject)
});

// Form schema for UI components
export const studentSubjectPreferenceFormSchema =
  studentSubjectPreferenceBaseSchema.extend({
    preferenceId: z.string().optional(),
  });

// Schema for bulk operations (adding multiple preferences for a student)
export const studentSubjectPreferenceBulkCreateSchema = z.object({
  studentId: z.string().min(1, "学生を選択してください"),
  preferences: z
    .array(
      z.object({
        subjectOfferingId: z.string().min(1, "科目提供を選択してください"),
        priority: z.number().int().min(1).max(10).default(1),
        notes: z.string().max(255).optional().nullable(),
      })
    )
    .min(1, "少なくとも1つの科目希望を選択してください"),
});

// Schema for reordering preferences (updating priorities)
export const studentSubjectPreferenceReorderSchema = z.object({
  studentId: z.string().min(1, "学生を選択してください"),
  preferences: z
    .array(
      z.object({
        preferenceId: z.string(),
        priority: z.number().int().min(1).max(10),
      })
    )
    .min(1, "少なくとも1つの希望を含める必要があります"),
});

export type StudentSubjectPreferenceCreate = z.infer<
  typeof studentSubjectPreferenceCreateSchema
>;
export type StudentSubjectPreferenceUpdate = z.infer<
  typeof studentSubjectPreferenceUpdateSchema
>;
export type StudentSubjectPreferenceFilter = z.infer<
  typeof studentSubjectPreferenceFilterSchema
>;
export type StudentSubjectPreferenceFormValues = z.infer<
  typeof studentSubjectPreferenceFormSchema
>;
export type StudentSubjectPreferenceBulkCreate = z.infer<
  typeof studentSubjectPreferenceBulkCreateSchema
>;
export type StudentSubjectPreferenceReorder = z.infer<
  typeof studentSubjectPreferenceReorderSchema
>;
