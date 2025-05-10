import { z } from "zod";

// Base schema with common fields
const EvaluationBaseSchema = z.object({
  name: z
    .string({
      required_error: "名前は必須です",
      invalid_type_error: "名前は文字列である必要があります",
    })
    .min(1, { message: "入力は必須です" })
    .max(100, { message: "100文字以内で入力してください" }),
  score: z
    .number({
      required_error: "スコアは必須です",
      invalid_type_error: "数値で入力してください",
    })
    .int({ message: "整数で入力してください" })
    .positive({ message: "正の数を入力してください" }),
  notes: z
    .string({ invalid_type_error: "備考は文字列である必要があります" })
    .max(255, { message: "255文字以内で入力してください" })
    .nullable()
    .default(""),
});

// Complete evaluation schema (includes all fields from the database)
export const EvaluationSchema = EvaluationBaseSchema.extend({
  evaluationId: z.string({
    required_error: "評価IDは必須です",
    invalid_type_error: "評価IDは文字列である必要があります",
  }),
  createdAt: z.date({
    required_error: "作成日は必須です",
    invalid_type_error: "作成日は有効な日付である必要があります",
  }),
  updatedAt: z.date({
    required_error: "更新日は必須です",
    invalid_type_error: "更新日は有効な日付である必要があります",
  }),
});

// Schema for creating a new evaluation (no evaluationId needed as it will be generated)
export const CreateEvaluationSchema = EvaluationBaseSchema.strict({
  message: "予期しないフィールドが含まれています",
});

// Schema for updating an existing evaluation (requires evaluationId)
export const UpdateEvaluationSchema = EvaluationBaseSchema.extend({
  evaluationId: z.string({
    required_error: "評価IDは必須です",
    invalid_type_error: "評価IDは文字列である必要があります",
  }),
}).strict({ message: "予期しないフィールドが含まれています" });

// Schema for retrieving a single evaluation by ID
export const EvaluationIdSchema = z
  .object({
    evaluationId: z.string({
      required_error: "IDは必須です",
      invalid_type_error: "IDは文字列である必要があります",
    }),
  })
  .strict({ message: "予期しないフィールドが含まれています" });

// Schema for querying evaluations with filtering, pagination, and sorting
export const EvaluationQuerySchema = z
  .object({
    page: z.coerce
      .number({ invalid_type_error: "ページ番号は数値に変換できません" })
      .int({ message: "ページ番号は整数である必要があります" })
      .positive({ message: "ページ番号は正の数である必要があります" })
      .optional()
      .default(1),
    limit: z.coerce
      .number({ invalid_type_error: "制限数は数値に変換できません" })
      .int({ message: "整数で入力してください" })
      .positive({ message: "正の数を入力してください" })
      .max(100, { message: "100以下の値を入力してください" })
      .optional()
      .default(10),
    name: z
      .string({ invalid_type_error: "名前は文字列である必要があります" })
      .optional(),
    score: z.coerce
      .number({ invalid_type_error: "スコアは数値に変換できません" })
      .int({ message: "整数で入力してください" })
      .positive({ message: "正の数を入力してください" })
      .optional(),
    sort: z
      .enum(["name", "score", "createdAt", "updatedAt"], {
        invalid_type_error: "ソートキーは文字列である必要があります",
        message: "無効なソートキーです",
      })
      .optional()
      .default("name"),
    order: z
      .enum(["asc", "desc"], {
        invalid_type_error: "順序は文字列である必要があります",
        message: "無効な順序です",
      })
      .optional()
      .default("desc"),
  })
  .strict({ message: "予期しないフィールドが含まれています" });

// TypeScript types derived from the schemas
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type CreateEvaluationInput = z.infer<typeof CreateEvaluationSchema>;
export type UpdateEvaluationInput = z.infer<typeof UpdateEvaluationSchema>;
export type EvaluationQuery = z.infer<typeof EvaluationQuerySchema>;
