import { z } from "zod";

// Base schema with common fields
const SubjectToSubjectTypeBaseSchema = z.object({
  subjectId: z.string({
    required_error: "科目IDは必須です",
    invalid_type_error: "科目IDは文字列である必要があります",
  }),
  subjectTypeId: z.string({
    required_error: "科目タイプIDは必須です",
    invalid_type_error: "科目タイプIDは文字列である必要があります",
  }),
});

// Complete subject to subject type schema (includes all fields from the database)
export const SubjectToSubjectTypeSchema = SubjectToSubjectTypeBaseSchema.extend({
  createdAt: z.date({
    required_error: "作成日は必須です",
    invalid_type_error: "作成日は有効な日付である必要があります",
  }),
  updatedAt: z.date({
    required_error: "更新日は必須です",
    invalid_type_error: "更新日は有効な日付である必要があります",
  }),
});

// Schema for creating a new subject to subject type mapping
export const CreateSubjectToSubjectTypeSchema =
  SubjectToSubjectTypeBaseSchema.strict({ message: "予期しないフィールドが含まれています" });

// Schema for updating an existing subject to subject type mapping
export const UpdateSubjectToSubjectTypeSchema =
  SubjectToSubjectTypeBaseSchema.strict({ message: "予期しないフィールドが含まれています" });

// Schema for retrieving a single subject to subject type mapping by composite ID
export const SubjectToSubjectTypeIdSchema = z
  .object({
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

// Schema for querying subject to subject type mappings with filtering, pagination, and sorting
export const SubjectToSubjectTypeQuerySchema = z
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
    subjectId: z
      .string({ invalid_type_error: "科目IDは文字列である必要があります" })
      .optional(),
    subjectTypeId: z
      .string({ invalid_type_error: "科目タイプIDは文字列である必要があります" })
      .optional(),
    sort: z
      .enum(["subjectId", "subjectTypeId", "createdAt", "updatedAt"], {
        invalid_type_error: "ソートキーは文字列である必要があります",
        required_error: "ソートキーは必須です", // Should not occur with .optional()
        message: "無効なソートキーです", // General message for invalid enum value
      })
      .optional()
      .default("createdAt"),
    order: z
      .enum(["asc", "desc"], {
        invalid_type_error: "順序は文字列である必要があります",
        required_error: "順序は必須です", // Should not occur with .optional()
        message: "無効な順序です", // General message for invalid enum value
      })
      .optional()
      .default("desc"),
  })
  .strict({ message: "予期しないフィールドが含まれています" });

// TypeScript types derived from the schemas
export type SubjectToSubjectType = z.infer<typeof SubjectToSubjectTypeSchema>;
export type CreateSubjectToSubjectTypeInput = z.infer<
  typeof CreateSubjectToSubjectTypeSchema
>;
export type UpdateSubjectToSubjectTypeInput = z.infer<
  typeof UpdateSubjectToSubjectTypeSchema
>;
export type SubjectToSubjectTypeQuery = z.infer<typeof SubjectToSubjectTypeQuerySchema>;
