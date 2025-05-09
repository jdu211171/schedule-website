import { z } from "zod";

// Base schema with common fields
const StudentPreferenceSubjectBaseSchema = z.object({
  studentId: z.string({ required_error: "生徒IDは必須です" }),
  subjectId: z.string({ required_error: "科目IDは必須です" }),
  subjectTypeId: z.string({ required_error: "科目タイプIDは必須です" }),
  preferenceId: z.string().optional(),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete student preference subject schema (includes all fields from the database)
export const StudentPreferenceSubjectSchema =
  StudentPreferenceSubjectBaseSchema.extend({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
  });

// Schema for creating a new student preference subject
export const CreateStudentPreferenceSubjectSchema =
  StudentPreferenceSubjectBaseSchema.strict();

// Schema for updating an existing student preference subject
export const UpdateStudentPreferenceSubjectSchema = z
  .object({
    id: z.string({ required_error: "IDは必須です" }),
    notes: z
      .string()
      .max(255, { message: "備考は255文字以内で入力してください" })
      .optional()
      .transform((val) => (val === "" ? undefined : val)),
  })
  .strict();

// Schema for retrieving a single student preference subject by ID
export const StudentPreferenceSubjectIdSchema = z
  .object({
    id: z.string({ required_error: "IDは必須です" }),
  })
  .strict();

// Schema for querying student preference subjects with filtering, pagination, and sorting
export const StudentPreferenceSubjectQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int({ message: "ページ番号は整数で入力してください" })
      .positive({ message: "ページ番号は正の整数で入力してください" })
      .optional()
      .default(1),
    limit: z.coerce
      .number()
      .int({ message: "表示件数は整数で入力してください" })
      .positive({ message: "表示件数は正の整数で入力してください" })
      .max(100, { message: "表示件数は100以下で入力してください" })
      .optional()
      .default(10),
    studentId: z.string().optional(), // Added studentId
    subjectId: z.string().optional(),
    subjectTypeId: z.string().optional(),
    preferenceId: z.string().optional(),
    sort: z
      .enum(
        [
          "id",
          "studentPreferenceId", // Added studentPreferenceId
          "subjectId",
          "subjectTypeId",
          "createdAt",
          "updatedAt",
        ],
        {
          errorMap: () => ({ message: "並び替えのフィールドが無効です" }),
        }
      )
      .optional()
      .default("createdAt"),
    order: z
      .enum(["asc", "desc"], {
        errorMap: () => ({ message: "並び順が無効です" }),
      })
      .optional()
      .default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type StudentPreferenceSubject = z.infer<
  typeof StudentPreferenceSubjectSchema
>;
export type CreateStudentPreferenceSubjectInput = z.infer<
  typeof CreateStudentPreferenceSubjectSchema
>;
export type UpdateStudentPreferenceSubjectInput = z.infer<
  typeof UpdateStudentPreferenceSubjectSchema
>;
export type StudentPreferenceSubjectQuery = z.infer<
  typeof StudentPreferenceSubjectQuerySchema
>;
