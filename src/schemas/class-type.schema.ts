import { z } from "zod";

// Base schema with common fields
const ClassTypeBaseSchema = z.object({
  name: z
    .string({
      required_error: "クラスタイプ名は必須です",
      invalid_type_error: "クラスタイプ名は文字列である必要があります",
    })
    .min(1, { message: "クラスタイプ名は1文字以上で入力してください" })
    .max(100, { message: "クラスタイプ名は100文字以内で入力してください" }),
  notes: z
    .string({ invalid_type_error: "備考は文字列である必要があります" })
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete class type schema (includes all fields from the database)
export const ClassTypeSchema = ClassTypeBaseSchema.extend({
  classTypeId: z.string({
    required_error: "クラスタイプIDは必須です",
    invalid_type_error: "クラスタイプIDは文字列である必要があります",
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

// Schema for creating a new class type (no classTypeId needed as it will be generated)
export const CreateClassTypeSchema = ClassTypeBaseSchema.strict({
  message: "予期しないフィールドが含まれています",
});

// Schema for updating an existing class type (requires classTypeId)
export const UpdateClassTypeSchema = ClassTypeBaseSchema.extend({
  classTypeId: z.string({
    required_error: "クラスタイプIDは必須です",
    invalid_type_error: "クラスタイプIDは文字列である必要があります",
  }),
}).strict({ message: "予期しないフィールドが含まれています" });

// Schema for retrieving a single class type by ID
export const ClassTypeIdSchema = z
  .object({
    classTypeId: z.string({
      required_error: "クラスタイプIDは必須です",
      invalid_type_error: "クラスタイプIDは文字列である必要があります",
    }),
  })
  .strict({ message: "予期しないフィールドが含まれています" });

// Schema for querying class types with filtering, pagination, and sorting
export const ClassTypeQuerySchema = z
  .object({
    page: z.coerce
      .number({ invalid_type_error: "ページ番号は数値に変換できません" })
      .int({ message: "ページ番号は整数である必要があります" })
      .positive({ message: "ページ番号は正の数である必要があります" })
      .optional()
      .default(1),
    limit: z.coerce
      .number({ invalid_type_error: "制限数は数値に変換できません" })
      .int({ message: "制限数は整数である必要があります" })
      .positive({ message: "制限数は正の数である必要があります" })
      .max(100, { message: "制限数は100以下である必要があります" })
      .optional()
      .default(10),
    name: z
      .string({ invalid_type_error: "名前は文字列である必要があります" })
      .optional(),
    sort: z
      .enum(["name", "createdAt", "updatedAt"], {
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
export type ClassType = z.infer<typeof ClassTypeSchema>;
export type CreateClassTypeInput = z.infer<typeof CreateClassTypeSchema>;
export type UpdateClassTypeInput = z.infer<typeof UpdateClassTypeSchema>;
export type ClassTypeQuery = z.infer<typeof ClassTypeQuerySchema>;
