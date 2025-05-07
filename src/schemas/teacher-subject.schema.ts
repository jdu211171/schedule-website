import { z } from "zod";

// Base schema with common fields
const TeacherSubjectBaseSchema = z.object({
  teacherId: z.string({ required_error: "講師IDは必須です" }),
  subjectId: z.string({ required_error: "科目IDは必須です" }),
  subjectTypeId: z.string({ required_error: "科目タイプIDは必須です" }),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete teacher subject schema (includes all fields from the database)
export const TeacherSubjectSchema = TeacherSubjectBaseSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new teacher subject
export const CreateTeacherSubjectSchema = TeacherSubjectBaseSchema.strict();

// Schema for updating an existing teacher subject
export const UpdateTeacherSubjectSchema = TeacherSubjectBaseSchema.strict();

// Schema for retrieving a single teacher subject by composite ID
export const TeacherSubjectIdSchema = z
  .object({
    teacherId: z.string({ required_error: "講師IDは必須です" }),
    subjectId: z.string({ required_error: "科目IDは必須です" }),
    subjectTypeId: z.string({ required_error: "科目タイプIDは必須です" }),
  })
  .strict();

// Schema for querying teacher subjects with filtering, pagination, and sorting
export const TeacherSubjectQuerySchema = z
  .object({
    page: z.coerce.number().int({ message: "ページ番号は整数で入力してください" }).positive({ message: "ページ番号は正の整数で入力してください" }).optional().default(1),
    limit: z.coerce.number().int({ message: "表示件数は整数で入力してください" }).positive({ message: "表示件数は正の整数で入力してください" }).max(100, { message: "表示件数は100以下で入力してください" }).optional().default(10),
    teacherId: z.string().optional(),
    subjectId: z.string().optional(),
    subjectTypeId: z.string().optional(),
    sort: z
      .enum(["teacherId", "subjectId", "subjectTypeId", "createdAt", "updatedAt"], {
        errorMap: () => ({ message: "並び替えのフィールドが無効です" })
      })
      .optional()
      .default("createdAt"),
    order: z.enum(["asc", "desc"], {
      errorMap: () => ({ message: "並び順が無効です" })
    }).optional().default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type TeacherSubject = z.infer<typeof TeacherSubjectSchema>;
export type CreateTeacherSubjectInput = z.infer<
  typeof CreateTeacherSubjectSchema
>;
export type UpdateTeacherSubjectInput = z.infer<
  typeof UpdateTeacherSubjectSchema
>;
export type TeacherSubjectQuery = z.infer<typeof TeacherSubjectQuerySchema>;
