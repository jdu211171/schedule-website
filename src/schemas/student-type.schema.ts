import { z } from "zod";

// Base schema with common fields
const StudentTypeBaseSchema = z.object({
  name: z
    .string({ invalid_type_error: "名前は文字列で入力してください" })
    .min(1, { message: "名前は1文字以上で入力してください" })
    .max(100, { message: "名前は100文字以内で入力してください" }),
  description: z
    .string({ invalid_type_error: "説明は文字列で入力してください" })
    .max(255, { message: "説明は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  maxYears: z
    .number({ invalid_type_error: "最大学年数は数値で入力してください" })
    .int({ message: "最大学年数は整数で入力してください" })
    .min(1, { message: "最大学年数は1以上の数値で入力してください" })
    .max(12, { message: "最大学年数は12以下の数値で入力してください" })
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
    page: z.coerce
      .number({ invalid_type_error: "ページ番号は数値で入力してください" })
      .int({ message: "ページ番号は整数で入力してください" })
      .positive({ message: "ページ番号は正の整数でなければなりません" })
      .optional()
      .default(1),
    limit: z.coerce
      .number({ invalid_type_error: "表示件数は数値で入力してください" })
      .int({ message: "表示件数は整数で入力してください" })
      .positive({ message: "表示件数は正の整数でなければなりません" })
      .max(100, { message: "表示件数は100件以下にしてください" })
      .optional()
      .default(10),
    name: z.string({ invalid_type_error: "名前は文字列で入力してください" }).optional(),
    sort: z
      .enum(["name", "createdAt", "updatedAt"], { errorMap: () => ({ message: "有効な並び替えフィールドを選択してください" }) })
      .optional()
      .default("name"),
    order: z
      .enum(["asc", "desc"], { errorMap: () => ({ message: "並び順は'asc'または'desc'を選択してください" }) })
      .optional()
      .default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type StudentType = z.infer<typeof StudentTypeSchema>;
export type CreateStudentTypeInput = z.infer<typeof CreateStudentTypeSchema>;
export type UpdateStudentTypeInput = z.infer<typeof UpdateStudentTypeSchema>;
export type StudentTypeQuery = z.infer<typeof StudentTypeQuerySchema>;
