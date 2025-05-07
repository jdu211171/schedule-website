import { z } from "zod";

// Base schema with common fields
const GradeBaseSchema = z.object({
  name: z
    .string()
    .min(1, { message: "名前は必須です" })
    .max(100, { message: "名前は100文字以内で入力してください" }),
  studentTypeId: z.string().min(1, { message: "学生タイプを選択してください" }),
  gradeYear: z.number().int({ message: "正しい学年を入力してください" }),
  notes: z
    .string()
    .max(255, { message: "メモは255文字以内で入力してください" })
    .nullable()
    .default(''),
});

// Complete grade schema (includes all fields from the database)
export const GradeSchema = GradeBaseSchema.extend({
  gradeId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new grade (no gradeId needed as it will be generated)
export const CreateGradeSchema = GradeBaseSchema.strict();

// Schema for updating an existing grade (requires gradeId)
export const UpdateGradeSchema = GradeBaseSchema.extend({
  gradeId: z.string({ required_error: "学年IDは必須です" }),
}).strict();

// Schema for retrieving a single grade by ID
export const GradeIdSchema = z
  .object({
    gradeId: z.string({ required_error: "学年IDは必須です" }),
  })
  .strict();

// Schema for querying grades with filtering, pagination, and sorting
export const GradeQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int({ message: "有効なページ番号を入力してください" })
      .positive({ message: "ページ番号は正の整数でなければなりません" })
      .optional()
      .default(1),
    limit: z.coerce
      .number()
      .int({ message: "有効な件数を入力してください" })
      .positive({ message: "表示件数は正の整数でなければなりません" })
      .max(100, { message: "表示件数は100件以下にしてください" })
      .optional()
      .default(10),
    name: z.string().optional(),
    studentTypeId: z.string().optional(),
    gradeYear: z.coerce
      .number()
      .int({ message: "学年は整数で入力してください" })
      .optional(),
    sort: z
      .enum(["name", "studentTypeId", "gradeYear", "createdAt", "updatedAt"], {
        errorMap: () => ({
          message: "有効な並び替えフィールドを選択してください",
        }),
      })
      .optional()
      .default("name"),
    order: z
      .enum(["asc", "desc"], {
        errorMap: () => ({
          message: "並び順は'asc'または'desc'を選択してください",
        }),
      })
      .optional()
      .default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type Grade = z.infer<typeof GradeSchema>;
export type CreateGradeInput = z.infer<typeof CreateGradeSchema>;
export type UpdateGradeInput = z.infer<typeof UpdateGradeSchema>;
export type GradeQuery = z.infer<typeof GradeQuerySchema>;
