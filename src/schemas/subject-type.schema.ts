import { Prisma } from "@prisma/client";
import { z } from "zod";

// Base schema with common fields
const SubjectTypeBaseSchema = z.object({
  name: z
    .string()
    .min(1, { message: "科目タイプ名は必須です" })
    .max(100, { message: "科目タイプ名は100文字以内で入力してください" }),
  notes: z
    .string()
    .max(255, { message: "備考は255文字以内で入力してください" })
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

// Complete subject type schema (includes all fields from the database)
export const SubjectTypeSchema = SubjectTypeBaseSchema.extend({
  subjectTypeId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new subject type (no subjectTypeId needed as it will be generated)
export const CreateSubjectTypeSchema = SubjectTypeBaseSchema.strict();

// Schema for updating an existing subject type (requires subjectTypeId)
export const UpdateSubjectTypeSchema = SubjectTypeBaseSchema.extend({
  subjectTypeId: z.string({ required_error: "科目タイプIDは必須です" }),
}).strict();

// Schema for retrieving a single subject type by ID
export const SubjectTypeIdSchema = z
  .object({
    subjectTypeId: z.string({ required_error: "科目タイプIDは必須です" }),
  })
  .strict();

// Schema for querying subject types with filtering, pagination, and sorting
export const SubjectTypeQuerySchema = z
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
    name: z.string().optional(),
    sort: z
      .enum(["name", "createdAt", "updatedAt"], {
        errorMap: () => ({ message: "並び替えのフィールドが無効です" }),
      })
      .optional()
      .default("name"),
    order: z
      .enum(["asc", "desc"], {
        errorMap: () => ({ message: "並び順が無効です" }),
      })
      .optional()
      .default("desc"),
  })
  .strict();

// TypeScript types derived from the schemas
export type SubjectType = z.infer<typeof SubjectTypeSchema>;
export type CreateSubjectTypeInput = z.infer<typeof CreateSubjectTypeSchema>;
export type UpdateSubjectTypeInput = z.infer<typeof UpdateSubjectTypeSchema>;
export type SubjectTypeQuery = z.infer<typeof SubjectTypeQuerySchema>;
export type SubjectTypeWithRelations = Prisma.SubjectTypeGetPayload<{
  include: {
    subjectToSubjectTypes: {
      include: {
        subject: true;
      };
    };
    classSessions: true;
    regularClassTemplates: true;
    teacherSubjects: true;
    StudentPreferenceSubject: true;
  };
}>;
