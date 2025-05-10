import { z } from "zod";

// Base schema with common fields
const TeacherSubjectBaseSchema = z.object({
  teacherId: z.string({
    required_error: "講師IDは必須です",
    invalid_type_error: "講師IDは文字列である必要があります",
  }),
  subjectId: z.string({
    required_error: "科目IDは必須です",
    invalid_type_error: "科目IDは文字列である必要があります",
  }),
  subjectTypeId: z.string({
    required_error: "科目タイプIDは必須です",
    invalid_type_error: "科目タイプIDは文字列である必要があります",
  }),
  notes: z
    .string({
      invalid_type_error: "備考は文字列である必要があります",
    })
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete teacher subject schema (includes all fields from the database)
export const TeacherSubjectSchema = TeacherSubjectBaseSchema.extend({
  createdAt: z.date({
    required_error: "作成日は必須です",
    invalid_type_error: "作成日は有効な日付である必要があります",
  }),
  updatedAt: z.date({
    required_error: "更新日は必須です",
    invalid_type_error: "更新日は有効な日付である必要があります",
  }),
});

// Schema for creating a new teacher subject
export const CreateTeacherSubjectSchema = TeacherSubjectBaseSchema.strict({
  message: "予期しないフィールドが含まれています",
});

// Schema for updating an existing teacher subject
export const UpdateTeacherSubjectSchema = TeacherSubjectBaseSchema.strict({
  message: "予期しないフィールドが含まれています",
});

// Schema for retrieving a single teacher subject by composite ID
export const TeacherSubjectIdSchema = z
  .object({
    teacherId: z.string({
      required_error: "講師IDは必須です",
      invalid_type_error: "講師IDは文字列である必要があります",
    }),
    subjectId: z.string({
      required_error: "科目IDは必須です",
      invalid_type_error: "科目IDは文字列である必要があります",
    }),
    subjectTypeId: z.string({
      required_error: "科目タイプIDは必須です",
      invalid_type_error: "科目タイプIDは文字列である必要があります",
    }),
  })
  .strict({ message: "予期しないフィールドが含まれています" });

// Schema for querying teacher subjects with filtering, pagination, and sorting
export const TeacherSubjectQuerySchema = z
  .object({
    page: z.coerce
      .number({ invalid_type_error: "ページ番号は数値である必要があります" })
      .int({ message: "ページ番号は整数で入力してください" })
      .positive({ message: "ページ番号は正の整数で入力してください" })
      .optional()
      .default(1),
    limit: z.coerce
      .number({ invalid_type_error: "表示件数は数値である必要があります" })
      .int({ message: "表示件数は整数で入力してください" })
      .positive({ message: "表示件数は正の整数で入力してください" })
      .max(100, { message: "表示件数は100以下で入力してください" })
      .optional()
      .default(10),
    teacherId: z
      .string({ invalid_type_error: "講師IDは文字列である必要があります" })
      .optional(),
    subjectId: z
      .string({ invalid_type_error: "科目IDは文字列である必要があります" })
      .optional(),
    subjectTypeId: z
      .string({ invalid_type_error: "科目タイプIDは文字列である必要があります" })
      .optional(),
    sort: z
      .enum(["teacherId", "subjectId", "subjectTypeId", "createdAt", "updatedAt"], {
        errorMap: () => ({ message: "並び替えのフィールドが無効です" }),
      })
      .optional()
      .default("createdAt"),
    order: z
      .enum(["asc", "desc"], {
        errorMap: () => ({ message: "並び順が無効です" }),
      })
      .optional()
      .default("desc"),
  })
  .strict({ message: "予期しないフィールドが含まれています" });

// TypeScript types derived from the schemas
export type TeacherSubject = z.infer<typeof TeacherSubjectSchema>;
export type CreateTeacherSubjectInput = z.infer<
  typeof CreateTeacherSubjectSchema
>;
export type UpdateTeacherSubjectInput = z.infer<
  typeof UpdateTeacherSubjectSchema
>;
export type TeacherSubjectQuery = z.infer<typeof TeacherSubjectQuerySchema>;
